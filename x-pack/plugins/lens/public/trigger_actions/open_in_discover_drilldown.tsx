/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IEmbeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Query, Filter, TimeRange } from '@kbn/es-query';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { CollectConfigProps as CollectConfigPropsBase } from '@kbn/kibana-utils-plugin/public';
import { reactToUiComponent } from '@kbn/kibana-react-plugin/public';
import {
  UiActionsEnhancedDrilldownDefinition as Drilldown,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { DiscoverSetup } from '@kbn/discover-plugin/public';
import { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { DataViewsService } from '@kbn/data-views-plugin/public';
import { execute, isCompatible, isLensEmbeddable } from './open_in_discover_helpers';

interface EmbeddableQueryInput extends EmbeddableInput {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

/** @internal */
export type EmbeddableWithQueryInput = IEmbeddable<EmbeddableQueryInput>;

interface UrlDrilldownDeps {
  discover: Pick<DiscoverSetup, 'locator'>;
  dataViews: () => Pick<DataViewsService, 'get'>;
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

const OPEN_IN_DISCOVER_DRILLDOWN = 'OPEN_IN_DISCOVER_DRILLDOWN';

export class OpenInDiscoverDrilldown
  implements Drilldown<Config, ActionContext, ActionFactoryContext>
{
  public readonly id = OPEN_IN_DISCOVER_DRILLDOWN;

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

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    openInNewTab: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    return true;
  };

  public readonly isCompatible = async (config: Config, context: ActionContext) => {
    return isCompatible({
      discover: this.deps.discover,
      dataViews: this.deps.dataViews(),
      hasDiscoverAccess: this.deps.hasDiscoverAccess(),
      ...context,
      embeddable: context.embeddable as IEmbeddable,
      ...config,
    });
  };

  public readonly isConfigurable = (context: ActionFactoryContext) => {
    return this.deps.hasDiscoverAccess() && isLensEmbeddable(context.embeddable as IEmbeddable);
  };

  public readonly execute = async (config: Config, context: ActionContext) => {
    execute({
      discover: this.deps.discover,
      dataViews: this.deps.dataViews(),
      hasDiscoverAccess: this.deps.hasDiscoverAccess(),
      ...context,
      embeddable: context.embeddable as IEmbeddable,
      openInSameTab: !config.openInNewTab,
    });
  };
}
