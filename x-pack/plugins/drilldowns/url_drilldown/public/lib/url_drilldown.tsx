/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IExternalUrl, IUiSettingsClient } from '@kbn/core/public';
import {
  ChartActionContext,
  CONTEXT_MENU_TRIGGER,
  IEmbeddable,
  EmbeddableInput,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { Query, Filter, TimeRange } from '@kbn/data-plugin/public';
import { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import {
  reactToUiComponent,
  UrlTemplateEditorVariable,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
import {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UrlDrilldownGlobalScope,
  UrlDrilldownConfig,
  UrlDrilldownCollectConfig,
  urlDrilldownValidateUrlTemplate,
  urlDrilldownCompileUrl,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { txtUrlDrilldownDisplayName } from './i18n';
import { getEventVariableList, getEventScopeValues } from './variables/event_variables';
import { getContextVariableList, getContextScopeValues } from './variables/context_variables';
import { getGlobalVariableList } from './variables/global_variables';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

/** @internal */
export type EmbeddableWithQueryInput = IEmbeddable<EmbeddableQueryInput>;

interface UrlDrilldownDeps {
  externalUrl: IExternalUrl;
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
  uiSettings: IUiSettingsClient;
}

export type ActionContext = ChartActionContext<EmbeddableWithQueryInput>;
export type Config = UrlDrilldownConfig;
export type UrlTrigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof SELECT_RANGE_TRIGGER
  | typeof ROW_CLICK_TRIGGER
  | typeof CONTEXT_MENU_TRIGGER;

export interface ActionFactoryContext extends BaseActionFactoryContext {
  embeddable?: EmbeddableWithQueryInput;
}
export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

const URL_DRILLDOWN = 'URL_DRILLDOWN';

export class UrlDrilldown implements Drilldown<Config, ActionContext, ActionFactoryContext> {
  public readonly id = URL_DRILLDOWN;

  constructor(private readonly deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  readonly minimalLicense = 'gold';
  readonly licenseFeatureName = 'URL drilldown';

  public readonly getDisplayName = () => txtUrlDrilldownDisplayName;

  public readonly euiIcon = 'link';

  supportedTriggers(): UrlTrigger[] {
    return [VALUE_CLICK_TRIGGER, SELECT_RANGE_TRIGGER, ROW_CLICK_TRIGGER, CONTEXT_MENU_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({
    config,
    onConfig,
    context,
  }) => {
    const [variables, exampleUrl] = React.useMemo(
      () => [this.getVariableList(context), this.getExampleUrl(context)],
      [context]
    );

    return (
      <KibanaContextProvider
        services={{
          uiSettings: this.deps.uiSettings,
        }}
      >
        <UrlDrilldownCollectConfig
          variables={variables}
          exampleUrl={exampleUrl}
          config={config}
          onConfig={onConfig}
          syntaxHelpDocsLink={this.deps.getSyntaxHelpDocsLink()}
          variablesHelpDocsLink={this.deps.getVariablesHelpDocsLink()}
        />
      </KibanaContextProvider>
    );
  };

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    url: {
      template: '',
    },
    openInNewTab: true,
    encodeUrl: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    return !!config.url.template;
  };

  public readonly isCompatible = async (config: Config, context: ActionContext) => {
    const scope = this.getRuntimeVariables(context);
    const { isValid, error } = await urlDrilldownValidateUrlTemplate(config.url, scope);

    if (!isValid) {
      // eslint-disable-next-line no-console
      console.warn(
        `UrlDrilldown [${config.url.template}] is not valid. Error [${error}]. Skipping execution.`
      );
      return false;
    }

    const url = await this.buildUrl(config, context);
    const validUrl = this.deps.externalUrl.validateUrl(url);
    if (!validUrl) {
      return false;
    }

    return true;
  };

  private async buildUrl(config: Config, context: ActionContext): Promise<string> {
    const doEncode = config.encodeUrl ?? true;
    const url = await urlDrilldownCompileUrl(
      config.url.template,
      this.getRuntimeVariables(context),
      doEncode
    );
    return url;
  }

  public readonly getHref = async (config: Config, context: ActionContext): Promise<string> => {
    const url = await this.buildUrl(config, context);
    const validUrl = this.deps.externalUrl.validateUrl(url);
    if (!validUrl) {
      throw new Error(
        `External URL [${url}] was denied by ExternalUrl service. ` +
          `You can configure external URL policies using "externalUrl.policy" setting in kibana.yml.`
      );
    }
    return url;
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    const url = await this.getHref(config, context);
    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      await this.deps.navigateToUrl(url);
    }
  };

  public readonly getRuntimeVariables = (context: ActionContext) => {
    return {
      event: getEventScopeValues(context),
      context: getContextScopeValues(context),
      ...this.deps.getGlobalScope(),
    };
  };

  public readonly getVariableList = (
    context: ActionFactoryContext
  ): UrlTemplateEditorVariable[] => {
    const globalScopeValues = this.deps.getGlobalScope();
    const eventVariables = getEventVariableList(context);
    const contextVariables = getContextVariableList(context);
    const globalVariables = getGlobalVariableList(globalScopeValues);

    return [...eventVariables, ...contextVariables, ...globalVariables];
  };

  public readonly getExampleUrl = (context: ActionFactoryContext): string => {
    switch (context.triggers[0]) {
      case SELECT_RANGE_TRIGGER:
        return 'https://www.example.com/?from={{event.from}}&to={{event.to}}';
      case CONTEXT_MENU_TRIGGER:
        return 'https://www.example.com/?panel={{context.panel.title}}';
      case ROW_CLICK_TRIGGER:
        return 'https://www.example.com/keys={{event.keys}}&values={{event.values}}';
      case VALUE_CLICK_TRIGGER:
      default:
        return 'https://www.example.com/?{{event.key}}={{event.value}}';
    }
  };
}
