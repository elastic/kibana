/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import {
  UiActionsEnhancedDrilldownDefinition as DrilldownDefinition,
  UiActionsEnhancedUrlDrilldownConfig as UrlDrilldownConfig,
  UiActionsEnhancedUrlDrilldownScope as UrlDrilldownScope,
  UiActionsEnhancedUrlDrilldownGlobalScope as UrlDrilldownGlobalScope,
  UiActionsEnhancedUrlDrilldownCollectConfig as UrlDrilldownCollectConfig,
  uiActionsEnhancedUrlDrilldownCompile as compile,
} from '../../../../ui_actions_enhanced/public';
import {
  IEmbeddable,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import {
  DataPublicPluginStart,
  esFilters,
  Filter,
  Query,
  TimeRange,
} from '../../../../../../src/plugins/data/public';

export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;
export type CollectConfigProps = CollectConfigPropsBase<
  UrlDrilldownConfig,
  { embeddable?: IEmbeddable }
>;

interface EmbeddableContextScope {
  panelId?: string;
  panelTitle?: string;
  savedObjectId?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

type EmbeddableToUrlDrilldownScope = UrlDrilldownScope<
  EmbeddableContextScope,
  EmbeddableTriggerEventScope
>;

interface EmbeddableTriggerEventScope {
  /**
   * More then one filter could come, for example, from heat map visualization
   */
  filters: EmbeddableTriggerFilter[];
  /**
   * 1st el from {@link filters}. just a shortcut.
   */
  filter?: EmbeddableTriggerFilter;
}

/**
 * Generalized & simplified interface which covers possible filters
 * that can be created from {@link ValueClickTriggerContext} & {@link RangeSelectTriggerContext} triggers
 */
interface EmbeddableTriggerFilter {
  key: string;
  value: string;
  negate: boolean;
  from: string;
  to: string;
}

const mockEventScope: EmbeddableTriggerEventScope = {
  filter: {
    key: '__testValueKey__',
    value: '__testValueValue__',
    from: '__testValueFrom__',
    to: '__testValueTo__',
    negate: false,
  },
  filters: [
    {
      key: '__testValueKey__',
      value: '__testValueValue__',
      from: '__testValueFrom__',
      to: '__testValueTo__',
      negate: false,
    },
  ],
};

function buildScope(
  global: UrlDrilldownGlobalScope,
  context: EmbeddableContextScope,
  event: EmbeddableTriggerEventScope = mockEventScope
): EmbeddableToUrlDrilldownScope {
  return {
    ...global,
    context,
    event,
  };
}

type DataActionsHelpers = Pick<
  DataPublicPluginStart['actions'],
  'createFiltersFromValueClickAction' | 'createFiltersFromRangeSelectAction'
>;
export interface Params {
  /**
   * Inject global static variables
   */
  getGlobalScope: () => UrlDrilldownGlobalScope;

  /**
   * Dependency on data plugin to extract filters from Click & Range actions
   */
  getDataActionsHelpers: () => DataActionsHelpers;
}

export class EmbeddableToUrlDrilldownDefinition
  implements DrilldownDefinition<UrlDrilldownConfig, ActionContext> {
  public readonly id = 'EMB_TO_URL_DRILLDOWN';

  public readonly minimalLicense = 'gold';

  public readonly order = 8;

  public readonly getDisplayName = () => 'Go to URL';

  public readonly euiIcon = 'link';

  constructor(private params: Params) {}

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => {
    const { getGlobalScope } = this.params;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const scope = React.useMemo(
      () => buildScope(getGlobalScope(), getContextScopeFromEmbeddable(context.embeddable)),
      [getGlobalScope, context]
    );

    return <UrlDrilldownCollectConfig config={config} onConfig={onConfig} scope={scope} />;
  };

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    url: '',
    openInNewTab: false,
  });

  public readonly isConfigValid = (config: UrlDrilldownConfig): config is UrlDrilldownConfig => {
    if (!config.url) return false;
    return isValidUrl(config.url);
  };

  /**
   * `getHref` is need to support mouse middle-click and Cmd + Click behavior
   * to open a link in new tab.
   */
  public readonly getHref = async (config: UrlDrilldownConfig, context: ActionContext) => {
    const globalScope = this.params.getGlobalScope();
    const contextScope = getContextScopeFromEmbeddable(context.embeddable);
    const eventScope = await getEventScopeFromActionContext(
      context,
      this.params.getDataActionsHelpers()
    );

    const scope = buildScope(globalScope, contextScope, eventScope);
    const url = compile(config.url, scope);

    return url;
  };

  public readonly execute = async (config: UrlDrilldownConfig, context: ActionContext) => {
    const url = await this.getHref(config, context);

    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      window.location.href = url;
    }
  };
}

function getContextScopeFromEmbeddable(embeddable?: IEmbeddable): EmbeddableContextScope {
  if (!embeddable) return {};
  const input = embeddable.getInput();
  const output = embeddable.getOutput();
  // TODO: type it better
  return {
    panelId: input.id,
    panelTitle: output.title,
    ..._.pick(input, ['query', 'timeRange', 'filters']),
    ...(output.savedObjectId
      ? { savedObjectId: output.savedObjectId }
      : _.pick(input, 'savedObjectId')),
  };
}

async function getEventScopeFromActionContext(
  context: ActionContext,
  { createFiltersFromRangeSelectAction, createFiltersFromValueClickAction }: DataActionsHelpers
): Promise<EmbeddableTriggerEventScope> {
  const filtersFromEvent = await (async () => {
    try {
      if (isRangeSelectTriggerContext(context))
        return await createFiltersFromRangeSelectAction(context.data);
      if (isValueClickTriggerContext(context))
        return await createFiltersFromValueClickAction(context.data);

      // eslint-disable-next-line no-console
      console.warn(
        `
          Url drilldown: can't extract filters from action.
          Is it not supported action?`,
        context
      );

      return [];
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        `
          URL drilldown: error extracting filters from action.
          Continuing without applying filters from event`,
        e
      );
      return [];
    }
  })();

  function dataFilterToEmbeddableTriggerFilter(filter: Filter): EmbeddableTriggerFilter {
    if (esFilters.isRangeFilter(filter)) {
      const rangeKey = Object.keys(filter.range)[0];
      const range = filter.range[rangeKey];
      return {
        key: rangeKey ?? filter.meta.key ?? '',
        value: (range.from ?? range.gt ?? range.gte ?? '').toString(),
        from: (range.from ?? range.gt ?? range.gte ?? '').toString(),
        to: (range.to ?? range.lt ?? range.lte ?? '').toString(),
        negate: filter.meta.negate ?? false,
      };
    } else {
      const value =
        (filter.meta.value &&
          (typeof filter.meta.value === 'string' ? filter.meta.value : filter.meta.value())) ??
        '';
      return {
        key: filter.meta.key ?? '',
        value:
          (filter.meta.value &&
            (typeof filter.meta.value === 'string' ? filter.meta.value : filter.meta.value())) ??
          '',
        from: value,
        to: value,
        negate: filter.meta.negate ?? false,
      };
    }
  }

  const eventFilters = filtersFromEvent.map(dataFilterToEmbeddableTriggerFilter);
  const eventScope: EmbeddableTriggerEventScope = {
    filters: eventFilters,
    filter: eventFilters[0],
  };

  return eventScope;
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
