/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IEmbeddable, EmbeddableInput, Embeddable } from '@kbn/embeddable-plugin/public';
import {
  Query,
  Filter,
  TimeRange,
  extractTimeRange,
  APPLY_FILTER_TRIGGER,
} from '@kbn/data-plugin/public';
import { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import { reactToUiComponent } from '@kbn/kibana-react-plugin/public';
import {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { createOpenInDiscoverAction } from './open_in_discover_action';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

/** @internal */
export type EmbeddableWithQueryInput = IEmbeddable<EmbeddableQueryInput>;

interface UrlDrilldownDeps {
  discover: DiscoverSetup;
  hasDiscoverAccess: () => boolean;
}

export type ActionContext = ApplyGlobalFilterActionContext;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Config = {
  openInNewTab: boolean;
};

export type OpenInDiscoverTrigger = typeof APPLY_FILTER_TRIGGER;

export interface ActionFactoryContext extends BaseActionFactoryContext {
  embeddable?: EmbeddableWithQueryInput;
}
export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

const URL_DRILLDOWN = 'OPEN_IN_DISCOVER_DRILLDOWN';

export class OpenInDiscoverDrilldown
  implements Drilldown<Config, ActionContext, ActionFactoryContext>
{
  public readonly id = URL_DRILLDOWN;

  constructor(private readonly deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  public readonly getDisplayName = () => 'Open in Discover';

  public readonly euiIcon = 'link';

  supportedTriggers(): OpenInDiscoverTrigger[] {
    return [APPLY_FILTER_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => {
    return (
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          id="openInNewTab"
          name="openInNewTab"
          label="Open in new tab"
          checked={config.openInNewTab}
          onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
          data-test-subj="openInDiscoverDrilldownOpenInNewTab"
        />
      </EuiFormRow>
    );
  };

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    openInNewTab: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    return true;
  };

  public readonly isCompatible = async (config: Config, context: ActionContext) => {
    return Boolean(
      context.embeddable &&
        (await createOpenInDiscoverAction(
          this.deps.discover,
          this.deps.hasDiscoverAccess()
        ).isCompatible({ embeddable: context.embeddable as Embeddable, trigger: { id: '' } }))
    );
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const { restOfFilters: filtersFromEvent, timeRange: timeRangeFromEvent } = extractTimeRange(
      context.filters,
      context.timeFieldName
    );
    await createOpenInDiscoverAction(this.deps.discover, this.deps.hasDiscoverAccess()).execute({
      embeddable: context.embeddable as Embeddable,
      filters: filtersFromEvent,
      timeRange: timeRangeFromEvent,
      openInSameTab: !config.openInNewTab,
      trigger: { id: '' },
    });
  };
}
