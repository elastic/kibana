/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { DOC_TYPE as LENS_DOC_TYPE } from '@kbn/lens-plugin/common/constants';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasType,
  apiIsOfType,
  apiPublishesDataViews,
  apiPublishesPartialLocalUnifiedSearch,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasType,
  PublishesDataViews,
} from '@kbn/presentation-publishing';
import { KibanaLocation } from '@kbn/share-plugin/public';

import * as shared from './shared';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

export interface PluginDeps {
  discover: Pick<DiscoverStart, 'locator'>;
}

export interface CoreDeps {
  application: Pick<CoreStart['application'], 'navigateToApp' | 'getUrlForApp'>;
}

export interface Params {
  start: StartServicesGetter<PluginDeps, unknown, CoreDeps>;
}

type AbstractExploreDataActionApi = CanAccessViewMode & HasType & PublishesDataViews;

const isApiCompatible = (api: unknown | null): api is AbstractExploreDataActionApi =>
  apiCanAccessViewMode(api) && apiHasType(api) && apiPublishesDataViews(api);

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  return (
    isApiCompatible(api) &&
    getInheritedViewMode(api) === ViewMode.VIEW &&
    !apiIsOfType(api, LENS_DOC_TYPE)
  );
};

export abstract class AbstractExploreDataAction {
  public readonly getIconType = (): string => 'discoverApp';

  public readonly getDisplayName = (): string =>
    i18n.translate('xpack.discover.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Explore underlying data',
    });

  constructor(protected readonly params: Params) {}

  public async getLocation({ embeddable }: EmbeddableApiContext): Promise<KibanaLocation> {
    const { plugins } = this.params.start();
    const { locator } = plugins.discover;

    if (!locator) {
      throw new Error('Discover URL locator not available.');
    }

    const params: DiscoverAppLocatorParams = {};
    params.dataViewId = shared.getDataViews(embeddable)[0] || undefined;
    if (
      apiHasParentApi(embeddable) &&
      apiPublishesPartialLocalUnifiedSearch(embeddable.parentApi)
    ) {
      if (embeddable.parentApi.localTimeRange)
        params.timeRange = embeddable.parentApi.localTimeRange.getValue();
      if (embeddable.parentApi.localQuery)
        params.query = embeddable.parentApi.localQuery.getValue();
      if (embeddable.parentApi.localFilters) {
        const filters = embeddable.parentApi.localFilters.getValue() ?? [];
        params.filters = [...filters, ...(params.filters || [])];
      }
    }

    const location = await locator.getLocation(params);
    return location;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    if (!compatibilityCheck(embeddable)) return false;

    const { core, plugins } = this.params.start();
    const { capabilities } = core.application;
    const hasDiscoverPermissions =
      Boolean(capabilities.discover) &&
      Boolean(capabilities.discover.show) &&
      Boolean(plugins.discover.locator);

    return hasDiscoverPermissions && shared.hasExactlyOneDataView(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!this.isCompatible({ embeddable })) return;

    const { core } = this.params.start();
    const { app, path } = await this.getLocation({ embeddable });

    await core.application.navigateToApp(app, {
      path,
    });
  }

  public async getHref({ embeddable }: EmbeddableApiContext): Promise<string> {
    if (!shared.hasExactlyOneDataView(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { core } = this.params.start();
    const { app, path } = await this.getLocation({ embeddable });
    const url = core.application.getUrlForApp(app, { path, absolute: false });

    return url;
  }
}
