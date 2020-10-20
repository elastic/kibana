/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { reactToUiComponent } from '../../../../../../src/plugins/kibana_react/public';
import {
  ChartActionContext,
  CONTEXT_MENU_TRIGGER,
  IEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';
import { CollectConfigProps as CollectConfigPropsBase } from '../../../../../../src/plugins/kibana_utils/public';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';
import {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UrlDrilldownGlobalScope,
  UrlDrilldownConfig,
  UrlDrilldownCollectConfig,
  urlDrilldownValidateUrlTemplate,
  urlDrilldownBuildScope,
  urlDrilldownCompileUrl,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '../../../../ui_actions_enhanced/public';
import { getContextScope, getEventScope, getMockEventScope } from './url_drilldown_scope';
import { txtUrlDrilldownDisplayName } from './i18n';

interface UrlDrilldownDeps {
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
}

export type ActionContext = ChartActionContext;
export type Config = UrlDrilldownConfig;
export type UrlTrigger =
  | typeof CONTEXT_MENU_TRIGGER
  | typeof VALUE_CLICK_TRIGGER
  | typeof SELECT_RANGE_TRIGGER;
export interface ActionFactoryContext extends BaseActionFactoryContext<UrlTrigger> {
  embeddable?: IEmbeddable;
}
export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

const URL_DRILLDOWN = 'URL_DRILLDOWN';

export class UrlDrilldown implements Drilldown<Config, UrlTrigger, ActionFactoryContext> {
  public readonly id = URL_DRILLDOWN;

  constructor(private deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  readonly minimalLicense = 'gold';
  readonly licenseFeatureName = 'URL drilldown';
  readonly isBeta = true;

  public readonly getDisplayName = () => txtUrlDrilldownDisplayName;

  public readonly euiIcon = 'link';

  supportedTriggers(): UrlTrigger[] {
    return [VALUE_CLICK_TRIGGER, SELECT_RANGE_TRIGGER, CONTEXT_MENU_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const scope = React.useMemo(() => this.buildEditorScope(context), [context]);
    return (
      <UrlDrilldownCollectConfig
        config={config}
        onConfig={onConfig}
        scope={scope}
        syntaxHelpDocsLink={this.deps.getSyntaxHelpDocsLink()}
        variablesHelpDocsLink={this.deps.getVariablesHelpDocsLink()}
      />
    );
  };

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    url: { template: '' },
    openInNewTab: false,
  });

  public readonly isConfigValid = (
    config: Config,
    context: ActionFactoryContext
  ): config is Config => {
    const { isValid } = urlDrilldownValidateUrlTemplate(config.url, this.buildEditorScope(context));
    return isValid;
  };

  public readonly isCompatible = async (config: Config, context: ActionContext) => {
    const { isValid, error } = urlDrilldownValidateUrlTemplate(
      config.url,
      await this.buildRuntimeScope(context)
    );

    if (!isValid) {
      // eslint-disable-next-line no-console
      console.warn(
        `UrlDrilldown [${config.url.template}] is not valid. Error [${error}]. Skipping execution.`
      );
    }

    return Promise.resolve(isValid);
  };

  public readonly getHref = async (config: Config, context: ActionContext) =>
    urlDrilldownCompileUrl(config.url.template, this.buildRuntimeScope(context));

  public readonly execute = async (config: Config, context: ActionContext) => {
    const url = urlDrilldownCompileUrl(config.url.template, this.buildRuntimeScope(context));
    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      await this.deps.navigateToUrl(url);
    }
  };

  private buildEditorScope = (context: ActionFactoryContext) => {
    return urlDrilldownBuildScope({
      globalScope: this.deps.getGlobalScope(),
      contextScope: getContextScope(context),
      eventScope: getMockEventScope(context.triggers),
    });
  };

  private buildRuntimeScope = (context: ActionContext) => {
    return urlDrilldownBuildScope({
      globalScope: this.deps.getGlobalScope(),
      contextScope: getContextScope(context),
      eventScope: getEventScope(context),
    });
  };
}
