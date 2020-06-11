/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import _ from 'lodash';
import { create as createHandlebars } from 'handlebars';
import {
  EuiFormRow,
  EuiSwitch,
  EuiTextArea,
  EuiContextMenuItem,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { encode } from 'rison-node';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import { UiActionsEnhancedDrilldownDefinition as DrilldownDefinition } from '../../../../ui_actions_enhanced/public';
import {
  IEmbeddable,
  isRangeSelectTriggerContext,
  isValueClickTriggerContext,
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
} from '../../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import { getFlattenedObject } from '../../../../../../src/core/public';
import {
  DataPublicPluginStart,
  Filter,
  esFilters,
  Query,
  TimeRange,
} from '../../../../../../src/plugins/data/public';

const handlebars = createHandlebars();

handlebars.registerHelper('json', (v) => {
  try {
    return JSON.stringify(v);
  } catch (e) {
    return v;
  }
});

handlebars.registerHelper('rison', (v) => {
  try {
    return encode(v);
  } catch (e) {
    return v;
  }
});

function interpolate(url: string, scope: Scope): string {
  try {
    const template = handlebars.compile(url);
    return template(scope);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
    return url;
  }
}

export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;

export interface Config {
  url: string;
  openInNewTab: boolean;
}

// TODO: is it fine to have embeddable as part of context here?
export type CollectConfigProps = CollectConfigPropsBase<Config, { embeddable?: IEmbeddable }>;

const URL_DRILLDOWN = 'URL_DRILLDOWN';

interface GlobalScope {
  [key: string]: unknown;
}

/**
 * TODO: how to make this flexible? :(
 */
interface EmbeddableContextScope {
  panelId?: string;
  panelTitle?: string;
  savedObjectId?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

type ContextScope = EmbeddableContextScope;

interface Scope extends GlobalScope {
  context: ContextScope;
  event: EventScope;
}

interface EventScope {
  filters: EventFilter[];
  /**
   * 1st el from {@link filters}
   */
  filter?: EventFilter;
}

/**
 * Generalized & simplified interface which covers possibly filters
 * that can be created from Range & Click action
 */
interface EventFilter {
  key: string;
  value: string;
  negate: boolean;
  from: string;
  to: string;
}

const mockEventScope: EventScope = {
  filter: {
    key: 'testKey',
    value: 'testValue',
    from: 'testFrom',
    to: 'testTo',
    negate: false,
  },
  filters: [
    {
      key: 'testKey',
      value: 'testValue',
      from: 'testFrom',
      to: 'testTo',
      negate: false,
    },
  ],
};

function buildScope(
  global: GlobalScope,
  context: ContextScope,
  event: EventScope = mockEventScope
): Scope {
  return {
    ...global,
    context,
    event,
  };
}

function buildVariableListForSuggestions(scope: Scope): string[] {
  return Object.keys(getFlattenedObject(scope));
}

export interface Params {
  /**
   * Inject global static variables
   */
  getGlobalScope: () => GlobalScope;

  /**
   * Dependency on data plugin to extract filters from Click & Range actions
   */
  getDataActionsHelpers: () => Pick<
    DataPublicPluginStart['actions'],
    'createFiltersFromValueClickAction' | 'createFiltersFromRangeSelectAction'
  >;
}

export class UrlDrilldownDefinition implements DrilldownDefinition<Config, ActionContext> {
  public readonly id = URL_DRILLDOWN;

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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const variables = React.useMemo(() => buildVariableListForSuggestions(scope), [scope]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const interpolatedUrl = React.useMemo(() => interpolate(config.url, scope), [
      config.url,
      scope,
    ]);
    const isValid = !interpolatedUrl || isValidUrl(interpolatedUrl);

    return (
      <>
        <EuiFormRow
          fullWidth
          isInvalid={!isValid}
          label={'Enter target URL'}
          labelAppend={
            <AddVariableButton
              variables={variables}
              onSelect={(variable: string) => {
                // TODO: preserve selection
                onConfig({ ...config, url: config.url + `{{${variable}}}` });
              }}
            />
          }
        >
          <EuiTextArea
            fullWidth
            // isInvalid={errors.subject.length > 0 && subject !== undefined}
            name="url"
            data-test-subj="urlInput"
            value={config.url}
            placeholder={'https://google.com/?q={{event.filter.value}}'}
            onChange={(event) => onConfig({ ...config, url: event.target.value })}
            onBlur={() => {
              if (!config.url) return;
              if (/https?:\/\//.test(config.url)) return;
              onConfig({ ...config, url: 'https://' + config.url });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={'Target URL preview'}
          isInvalid={!isValid}
          labelAppend={
            <EuiText size="xs">
              <EuiLink href={interpolatedUrl} target="_blank" external>
                Preview
              </EuiLink>
            </EuiText>
          }
        >
          <EuiTextArea
            fullWidth
            name="urlPreview"
            data-test-subj="urlPreview"
            value={interpolatedUrl}
            disabled={true}
          />
        </EuiFormRow>
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="openInNewTab"
            label="Open in new tab?"
            checked={config.openInNewTab}
            onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
          />
        </EuiFormRow>
      </>
    );
  };

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    url: '',
    openInNewTab: false,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.url) return false;
    return isValidUrl(config.url);
  };

  /**
   * `getHref` is need to support mouse middle-click and Cmd + Click behavior
   * to open a link in new tab.
   */
  public readonly getHref = async (config: Config, context: ActionContext) => {
    const globalScope = this.params.getGlobalScope();
    const contextScope = getContextScopeFromEmbeddable(context.embeddable);
    const {
      createFiltersFromRangeSelectAction,
      createFiltersFromValueClickAction,
    } = this.params.getDataActionsHelpers();
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

    const eventFilters = filtersFromEvent.map(filterToEventFilter);
    const eventScope: EventScope = {
      filters: eventFilters,
      filter: eventFilters[0],
    };

    const scope = buildScope(globalScope, contextScope, eventScope);
    const url = interpolate(config.url, scope);

    return url;
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const url = await this.getHref(config, context);

    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      window.location.href = url;
    }
  };
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function AddVariableButton({
  variables,
  onSelect,
}: {
  variables: string[];
  onSelect: (variable: string) => void;
}) {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);

  const renderVariables = () =>
    variables.map((variable: string, i: number) => (
      <EuiContextMenuItem
        key={variable}
        data-test-subj={`variableMenuButton-${i}`}
        icon="empty"
        onClick={() => {
          onSelect(variable);
          setIsVariablesPopoverOpen(false);
        }}
      >
        {`{{${variable}}}`}
      </EuiContextMenuItem>
    ));

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj={`addUrlContextVariable`}
          onClick={() => setIsVariablesPopoverOpen(true)}
          iconType="indexOpen"
          title={'Add variable'}
          aria-label={'Add variable'}
        />
      }
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel className="messageVariablesPanel" items={renderVariables()} />
    </EuiPopover>
  );
}

function filterToEventFilter(filter: Filter): EventFilter {
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

function getContextScopeFromEmbeddable(embeddable?: IEmbeddable): ContextScope {
  if (!embeddable) return {};
  const input = embeddable.getInput();
  return {
    panelId: input.id,
    panelTitle: input.title,
    ..._.pick(input, ['savedObjectId', 'query', 'timeRange', 'filters']),
  }; // TODO: not type safe :(
}
