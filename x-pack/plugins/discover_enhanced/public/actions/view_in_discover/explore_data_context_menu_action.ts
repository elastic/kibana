/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { DiscoverStart } from '../../../../../../src/plugins/discover/public';
import {
  EmbeddableContext,
  IEmbeddable,
  ViewMode,
} from '../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';
import {
  VisualizeEmbeddableContract,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../../../../../../src/plugins/visualizations/public';

// TODO: Replace this logic with KibanaURL once it is available.
// https://github.com/elastic/kibana/issues/64497
class KibanaURL {
  public readonly path: string;
  public readonly appName: string;
  public readonly appPath: string;

  constructor(path: string) {
    const match = path.match(/^.*\/app\/([^\/#]+)(.+)$/);

    if (!match) {
      throw new Error('Unexpected Discover URL path.');
    }

    const [, appName, appPath] = match;

    if (!appName || !appPath) {
      throw new Error('Could not parse Discover URL path.');
    }

    this.path = path;
    this.appName = appName;
    this.appPath = appPath;
  }
}

export const ACTION_EXPLORE_DATA = 'ACTION_EXPLORE_DATA';

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

const isVisualizeEmbeddable = (
  embeddable: IEmbeddable
): embeddable is VisualizeEmbeddableContract => embeddable?.type === VISUALIZE_EMBEDDABLE_TYPE;

export interface PluginDeps {
  discover: Pick<DiscoverStart, 'urlGenerator'>;
}

export interface CoreDeps {
  application: Pick<CoreStart['application'], 'navigateToApp'>;
}

export interface Params {
  start: StartServicesGetter<PluginDeps, unknown, CoreDeps>;
}

export class ExploreDataContextMenuAction implements Action<EmbeddableContext> {
  public readonly id = ACTION_EXPLORE_DATA;

  public readonly type = ACTION_EXPLORE_DATA;

  public readonly order = 200;

  constructor(private readonly params: Params) {}

  public getDisplayName() {
    return i18n.translate('xpack.discover.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Explore underlying data',
    });
  }

  public getIconType() {
    return 'discoverApp';
  }

  public async isCompatible({ embeddable }: EmbeddableContext) {
    if (!this.params.start().plugins.discover.urlGenerator) return false;
    if (!isVisualizeEmbeddable(embeddable)) return false;
    if (!this.getIndexPattern(embeddable)) return false;
    if (embeddable.getInput().viewMode !== ViewMode.VIEW) return false;
    return true;
  }

  public async execute({ embeddable }: EmbeddableContext) {
    if (!isVisualizeEmbeddable(embeddable)) return;

    const { core } = this.params.start();
    const { appName, appPath } = await this.getUrl(embeddable);

    await core.application.navigateToApp(appName, {
      path: appPath,
    });
  }

  public async getHref({ embeddable }: EmbeddableContext): Promise<string> {
    if (!isVisualizeEmbeddable(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { path } = await this.getUrl(embeddable);

    return path;
  }

  private async getUrl(embeddable: VisualizeEmbeddableContract): Promise<KibanaURL> {
    const { plugins } = this.params.start();
    const { urlGenerator } = plugins.discover;

    if (!urlGenerator) {
      throw new Error('Discover URL generator not available.');
    }

    const { timeRange, query, filters } = embeddable.getInput();
    const indexPatternId = this.getIndexPattern(embeddable);

    const path = await urlGenerator.createUrl({
      indexPatternId,
      filters,
      query,
      timeRange,
    });

    return new KibanaURL(path);
  }

  /**
   * @returns Returns empty string if no index pattern ID found.
   */
  private getIndexPattern(embeddable: VisualizeEmbeddableContract): string {
    const output = embeddable!.getOutput();

    if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
      return output.indexPatterns[0].id;
    }

    return '';
  }
}
