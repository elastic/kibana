/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { ViewMode, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { DOC_TYPE as LENS_DOC_TYPE } from '@kbn/lens-plugin/common/constants';
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

export abstract class AbstractExploreDataAction<Context extends { embeddable?: IEmbeddable }> {
  public readonly getIconType = (context: Context): string => 'discoverApp';

  public readonly getDisplayName = (context: Context): string =>
    i18n.translate('xpack.discover.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Explore underlying data',
    });

  constructor(protected readonly params: Params) {}

  protected abstract getLocation(context: Context): Promise<KibanaLocation>;

  public async isCompatible({ embeddable }: Context): Promise<boolean> {
    if (!embeddable) return false;
    if (embeddable.type === LENS_DOC_TYPE) return false;

    const { core, plugins } = this.params.start();
    const { capabilities } = core.application;

    if (capabilities.discover && !capabilities.discover.show) return false;
    if (!plugins.discover.locator) return false;
    if (!shared.hasExactlyOneIndexPattern(embeddable)) return false;
    if (embeddable.getInput().viewMode !== ViewMode.VIEW) return false;

    return true;
  }

  public async execute(context: Context): Promise<void> {
    if (!shared.hasExactlyOneIndexPattern(context.embeddable)) return;

    const { core } = this.params.start();
    const { app, path } = await this.getLocation(context);

    await core.application.navigateToApp(app, {
      path,
    });
  }

  public async getHref(context: Context): Promise<string> {
    const { embeddable } = context;

    if (!shared.hasExactlyOneIndexPattern(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName(context)}" action.`);
    }

    const { core } = this.params.start();
    const { app, path } = await this.getLocation(context);
    const url = await core.application.getUrlForApp(app, { path, absolute: false });

    return url;
  }
}
