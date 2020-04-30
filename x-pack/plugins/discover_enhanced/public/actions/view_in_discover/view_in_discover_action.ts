/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { EmbeddableContext } from '../../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';
import { DISCOVER_APP_URL_GENERATOR } from '../../../../../../src/plugins/discover/public';
import { DiscoverEnhancedStartDependencies } from '../../plugin';

export const ACTION_VIEW_IN_DISCOVER = 'ACTION_VIEW_IN_DISCOVER';

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

interface Params {
  start: StartServicesGetter<
    Pick<DiscoverEnhancedStartDependencies, 'share'>,
    unknown,
    Pick<CoreStart, 'application'>
  >;
}

export class ViewInDiscoverAction implements Action<EmbeddableContext> {
  public readonly id = ACTION_VIEW_IN_DISCOVER;

  public readonly type = ACTION_VIEW_IN_DISCOVER;

  public readonly order = 10;

  constructor(private readonly params: Params) {}

  public getDisplayName() {
    return 'View in Discover';
  }

  public getIconType() {
    return 'discoverApp';
  }

  public async isCompatible() {
    return true;
  }

  public async execute(context: EmbeddableContext) {
    const { core, plugins } = this.params.start();

    let indexPatternId = '';

    const output = context.embeddable!.getOutput();
    if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
      indexPatternId = output.indexPatterns[0].id;
    }

    const path = await plugins
      .share!.urlGenerators.getUrlGenerator(DISCOVER_APP_URL_GENERATOR)
      .createUrl({
        indexPatternId,
      });

    await core.application.navigateToApp('kibana', {
      path: '#' + path.split('#')[1],
    });
  }
}
