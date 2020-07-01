/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import { TriggerId } from '../../../../../../src/plugins/ui_actions/public';
import { UrlDrilldownConfig, UrlDrilldownGlobalScope, UrlDrilldownScope } from './types';
import { DrilldownDefinition } from '../drilldown_definition';
import { UrlDrilldownTriggerRegistry } from './url_drilldown_trigger_registry';
import { UrlDrilldownCollectConfig } from './components';
import { compile } from './url_template';
import { UrlDrilldownContextProviderRegistry } from './url_drilldown_context_provider_registry';

export type CollectConfigProps = CollectConfigPropsBase<
  UrlDrilldownConfig,
  {
    selectedTrigger?: TriggerId;
  }
>;

type ActionContext = object;

function buildScope(
  global: UrlDrilldownGlobalScope,
  context: UrlDrilldownScope['context'],
  event: UrlDrilldownScope['event']
): UrlDrilldownScope {
  return {
    ...global,
    context,
    event,
  };
}

export interface Params {
  /**
   * Inject global static variables
   */
  getGlobalScope: () => UrlDrilldownGlobalScope;

  /**
   * Lets url drilldown know about trigger type
   */
  triggerRegistry: UrlDrilldownTriggerRegistry;

  /**
   * Lets url know about context (e.g. embeddable context)
   */
  contextProviderRegistry: UrlDrilldownContextProviderRegistry;
}

export class UrlDrilldownDefinition
  implements DrilldownDefinition<UrlDrilldownConfig, ActionContext> {
  public readonly id = 'URL_DRILLDOWN';

  public readonly minimalLicense = 'gold';

  public readonly order = 8;

  public readonly getDisplayName = () => 'Go to URL';

  public readonly euiIcon = 'link';

  private readonly triggerRegistry: UrlDrilldownTriggerRegistry;
  private readonly contextProviderRegistry: UrlDrilldownContextProviderRegistry;

  constructor(private params: Params) {
    this.triggerRegistry = params.triggerRegistry;
    this.contextProviderRegistry = params.contextProviderRegistry;
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => {
    const { getGlobalScope } = this.params;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const scope = React.useMemo(
      () =>
        buildScope(
          getGlobalScope(), // global
          this.contextProviderRegistry.buildContextScope(context), // embeddable
          context.selectedTrigger
            ? this.triggerRegistry.getEventScopeForPreview(context.selectedTrigger) // trigger
            : {}
        ),
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
    const contextScope = this.contextProviderRegistry.buildContextScope(context);
    const eventScope = await this.triggerRegistry.getEventScopeFromActionContext(context);

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

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
