/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IExternalUrl, ThemeServiceStart } from '@kbn/core/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  ChartActionContext,
  CONTEXT_MENU_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { IMAGE_CLICK_TRIGGER } from '@kbn/image-embeddable-plugin/public';
import { ActionExecutionContext, ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import { UrlTemplateEditorVariable, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UrlDrilldownGlobalScope,
  UrlDrilldownConfig,
  UrlDrilldownCollectConfig,
  urlDrilldownValidateUrlTemplate,
  urlDrilldownCompileUrl,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { SerializedAction } from '@kbn/ui-actions-enhanced-plugin/common/types';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { txtUrlDrilldownDisplayName } from './i18n';
import { getEventVariableList, getEventScopeValues } from './variables/event_variables';
import { getContextVariableList, getContextScopeValues } from './variables/context_variables';
import { getGlobalVariableList } from './variables/global_variables';

interface UrlDrilldownDeps {
  externalUrl: IExternalUrl;
  getGlobalScope: () => UrlDrilldownGlobalScope;
  navigateToUrl: (url: string) => Promise<void>;
  getSyntaxHelpDocsLink: () => string;
  getVariablesHelpDocsLink: () => string;
  settings: SettingsStart;
  theme: () => ThemeServiceStart;
}

export type Config = UrlDrilldownConfig;
export type UrlTrigger =
  | typeof VALUE_CLICK_TRIGGER
  | typeof SELECT_RANGE_TRIGGER
  | typeof ROW_CLICK_TRIGGER
  | typeof CONTEXT_MENU_TRIGGER
  | typeof IMAGE_CLICK_TRIGGER;

export type ActionFactoryContext = Partial<EmbeddableApiContext> & BaseActionFactoryContext;

export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

const URL_DRILLDOWN = 'URL_DRILLDOWN';

export class UrlDrilldown implements Drilldown<Config, ChartActionContext, ActionFactoryContext> {
  public readonly id = URL_DRILLDOWN;

  constructor(private readonly deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  readonly minimalLicense = 'gold';
  readonly licenseFeatureName = 'URL drilldown';

  public readonly getDisplayName = () => txtUrlDrilldownDisplayName;

  public readonly actionMenuItem: React.FC<{
    config: Omit<SerializedAction<UrlDrilldownConfig>, 'factoryId'>;
    context: ChartActionContext | ActionExecutionContext<ChartActionContext>;
  }> = ({ config, context }) => {
    const [title, setTitle] = React.useState(config.name);
    React.useEffect(() => {
      let unmounted = false;
      const variables = this.getRuntimeVariables(context);
      urlDrilldownCompileUrl(title, variables, false)
        .then((result) => {
          if (unmounted) return;
          if (title !== result) setTitle(result);
        })
        .catch(() => {});
      return () => {
        unmounted = true;
      };
    });
    return <>{title}</>;
  };

  public readonly euiIcon = 'link';

  supportedTriggers(): UrlTrigger[] {
    return [
      VALUE_CLICK_TRIGGER,
      SELECT_RANGE_TRIGGER,
      ROW_CLICK_TRIGGER,
      CONTEXT_MENU_TRIGGER,
      IMAGE_CLICK_TRIGGER,
    ];
  }
  public readonly CollectConfig: React.FC<CollectConfigProps> = ({ config, onConfig, context }) => {
    const [variables, exampleUrl] = React.useMemo(
      () => [this.getVariableList(context), this.getExampleUrl(context)],
      [context]
    );

    return (
      <KibanaContextProvider
        services={{
          settings: this.deps.settings,
          theme: this.deps.theme(),
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

  public readonly isCompatible = async (config: Config, context: ChartActionContext) => {
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

  private async buildUrl(config: Config, context: ChartActionContext): Promise<string> {
    const doEncode = config.encodeUrl ?? true;
    const url = await urlDrilldownCompileUrl(
      config.url.template,
      this.getRuntimeVariables(context),
      doEncode
    );
    return url;
  }

  public readonly getHref = async (
    config: Config,
    context: ChartActionContext
  ): Promise<string> => {
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

  public readonly execute = async (config: Config, context: ChartActionContext) => {
    const url = await this.getHref(config, context);
    if (config.openInNewTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      await this.deps.navigateToUrl(url);
    }
  };

  public readonly getRuntimeVariables = (context: ChartActionContext) => {
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
      case IMAGE_CLICK_TRIGGER:
        return 'https://www.example.com/?panel={{context.panel.title}}';
      case ROW_CLICK_TRIGGER:
        return 'https://www.example.com/keys={{event.keys}}&values={{event.values}}';
      case VALUE_CLICK_TRIGGER:
      default:
        return 'https://www.example.com/?{{event.key}}={{event.value}}';
    }
  };
}
