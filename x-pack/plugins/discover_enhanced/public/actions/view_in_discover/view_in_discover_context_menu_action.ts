/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import {
  EmbeddableContext,
  IEmbeddable,
  ViewMode,
} from '../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';
import { DISCOVER_APP_URL_GENERATOR } from '../../../../../../src/plugins/discover/public';
import { DiscoverEnhancedStartDependencies } from '../../plugin';
import {
  VisualizeEmbeddableContract,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../../../../../../src/plugins/visualizations/public';

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

interface Params {
  start: StartServicesGetter<
    Pick<DiscoverEnhancedStartDependencies, 'share'>,
    unknown,
    Pick<CoreStart, 'application'>
  >;
}

export class ExploreDataContextMenuAction implements Action<EmbeddableContext> {
  public readonly id = ACTION_EXPLORE_DATA;

  public readonly type = ACTION_EXPLORE_DATA;

  public readonly order = 200;

  constructor(private readonly params: Params) {}

  public getDisplayName() {
    return 'View in Discover';
  }

  public getIconType() {
    return 'discoverApp';
  }

  public async isCompatible({ embeddable }: EmbeddableContext) {
    if (!isVisualizeEmbeddable(embeddable)) return false;
    if (!this.getIndexPattern(embeddable)) return false;
    if (embeddable.getInput().viewMode !== ViewMode.VIEW) return false;
    return true;
  }

  public async execute({ embeddable }: EmbeddableContext) {
    if (!isVisualizeEmbeddable(embeddable)) return;

    const { core } = this.params.start();
    const url = await this.getUrl(embeddable);

    await core.application.navigateToApp('kibana', {
      path: '#' + url.split('#')[1],
    });
  }

  public async getHref({ embeddable }: EmbeddableContext): Promise<string> {
    if (!isVisualizeEmbeddable(embeddable)) {
      throw new Error(`Embeddable not supported for "${this.getDisplayName()}" action.`);
    }

    const { core } = this.params.start();
    const url = await this.getUrl(embeddable);

    return core.application.getUrlForApp('kibana', {
      path: '#' + url.split('#')[1],
    });
  }

  private async getUrl(embeddable: VisualizeEmbeddableContract): Promise<string> {
    const { plugins } = this.params.start();

    const { timeRange, query, filters } = embeddable.getInput();
    const indexPatternId = this.getIndexPattern(embeddable);

    const url = await plugins
      .share!.urlGenerators.getUrlGenerator(DISCOVER_APP_URL_GENERATOR)
      .createUrl({
        indexPatternId,
        filters,
        query,
        timeRange,
      });

    return url;
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
