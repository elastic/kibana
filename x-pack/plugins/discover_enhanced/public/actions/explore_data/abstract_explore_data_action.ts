/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { DiscoverStart } from '../../../../../../src/plugins/discover/public';
import { EmbeddableStart } from '../../../../../../src/plugins/embeddable/public';
import { ViewMode, IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';
import { KibanaURL } from './kibana_url';
import * as shared from './shared';

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

export interface PluginDeps {
  discover: Pick<DiscoverStart, 'urlGenerator'>;
  embeddable: Pick<EmbeddableStart, 'filtersAndTimeRangeFromContext'>;
}

export interface CoreDeps {
  application: Pick<CoreStart['application'], 'navigateToApp'>;
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

  protected abstract async getUrl(context: Context): Promise<KibanaURL>;

  public async isCompatible({ embeddable }: Context): Promise<boolean> {
    if (!embeddable) return false;
    if (!this.params.start().plugins.discover.urlGenerator) return false;
    if (!shared.hasExactlyOneIndexPattern(embeddable)) return false;
    if (embeddable.getInput().viewMode !== ViewMode.VIEW) return false;
    return true;
  }

  public async execute(context: Context): Promise<void> {
    if (!shared.hasExactlyOneIndexPattern(context.embeddable)) return;

    const { core } = this.params.start();
    const { appName, appPath } = await this.getUrl(context);

    await core.application.navigateToApp(appName, {
      path: appPath,
    });
  }

  public async getHref(context: Context): Promise<string> {
    const { embeddable } = context;

    if (!shared.hasExactlyOneIndexPattern(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName(context)}" action.`);
    }

    const { path } = await this.getUrl(context);

    return path;
  }
}
