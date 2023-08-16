/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IEmbeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Query, Filter, TimeRange } from '@kbn/es-query';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import type {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { DOC_TYPE } from '../../common/constants';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

export const getDiscoverHelpersAsync = async () => await import('../async_services');

/** @internal */
export type EmbeddableWithQueryInput = IEmbeddable<EmbeddableQueryInput>;

interface UrlDrilldownDeps {
  locator: () => DiscoverAppLocator | undefined;
  dataViews: () => Pick<DataViewsService, 'get'>;
  hasDiscoverAccess: () => boolean;
  application: () => ApplicationStart;
}

export type ActionContext = ApplyGlobalFilterActionContext;

export interface Config extends SerializableRecord {
  openInNewTab: boolean;
}

export type OpenInDiscoverTrigger = typeof APPLY_FILTER_TRIGGER;

export interface ActionFactoryContext extends BaseActionFactoryContext {
  embeddable?: EmbeddableWithQueryInput;
}
export type CollectConfigProps = CollectConfigPropsBase<Config, ActionFactoryContext>;

export class OpenInDiscoverDrilldown
  implements Drilldown<Config, ActionContext, ActionFactoryContext>
{
  public readonly id = 'OPEN_IN_DISCOVER_DRILLDOWN';

  constructor(private readonly deps: UrlDrilldownDeps) {}

  public readonly order = 8;

  public readonly getDisplayName = () =>
    i18n.translate('xpack.lens.app.exploreDataInDiscoverDrilldown', {
      defaultMessage: 'Open in Discover',
    });

  public readonly euiIcon = 'discoverApp';

  supportedTriggers(): OpenInDiscoverTrigger[] {
    return [APPLY_FILTER_TRIGGER];
  }

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = ({ config, onConfig }) => {
    return (
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          id="openInNewTab"
          name="openInNewTab"
          label={i18n.translate('xpack.lens.app.exploreDataInDiscoverDrilldown.newTabConfig', {
            defaultMessage: 'Open in new tab',
          })}
          checked={config.openInNewTab}
          onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
          data-test-subj="openInDiscoverDrilldownOpenInNewTab"
        />
      </EuiFormRow>
    );
  };

  public readonly CollectConfig = this.ReactCollectConfig;

  public readonly createConfig = () => ({
    openInNewTab: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    return true;
  };

  public readonly isCompatible = async (config: Config, context: ActionContext) => {
    const { isCompatible } = await getDiscoverHelpersAsync();

    return isCompatible({
      locator: this.deps.locator(),
      dataViews: this.deps.dataViews(),
      hasDiscoverAccess: this.deps.hasDiscoverAccess(),
      ...context,
      embeddable: context.embeddable as IEmbeddable,
      ...config,
    });
  };

  public readonly isConfigurable = (context: ActionFactoryContext) =>
    this.deps.hasDiscoverAccess() && context.embeddable?.type === DOC_TYPE;

  public readonly getHref = async (config: Config, context: ActionContext) => {
    const { getHref } = await getDiscoverHelpersAsync();

    return getHref({
      locator: this.deps.locator(),
      dataViews: this.deps.dataViews(),
      hasDiscoverAccess: this.deps.hasDiscoverAccess(),
      ...context,
      embeddable: context.embeddable as IEmbeddable,
    });
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    if (config.openInNewTab) {
      window.open(await this.getHref(config, context), '_blank');
    } else {
      const { getLocation } = await getDiscoverHelpersAsync();

      const { app, path, state } = await getLocation({
        locator: this.deps.locator(),
        dataViews: this.deps.dataViews(),
        hasDiscoverAccess: this.deps.hasDiscoverAccess(),
        ...context,
        embeddable: context.embeddable as IEmbeddable,
      });
      await this.deps.application().navigateToApp(app, { path, state });
    }
  };
}
