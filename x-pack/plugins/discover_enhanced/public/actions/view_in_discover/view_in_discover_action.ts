/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../../../../../../src/plugins/ui_actions/public';
import { EmbeddableContext } from '../../../../../../src/plugins/embeddable/public';

export const ACTION_VIEW_IN_DISCOVER = 'ACTION_VIEW_IN_DISCOVER';

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

export class ViewInDiscoverAction implements Action<EmbeddableContext> {
  public readonly id = ACTION_VIEW_IN_DISCOVER;
  public readonly type = ACTION_VIEW_IN_DISCOVER;

  public readonly order = 10;

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
    let indexPatternId = '';

    const output = context.embeddable!.getOutput();
    if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
      indexPatternId = output.indexPatterns[0].id;
    }

    const index = indexPatternId ? `,index:'${indexPatternId}'` : '';
    const path = `#/discover?_g=(filters:!(),refreshInterval:(pause:!f,value:900000),time:(from:now-7d,to:now))&_a=(columns:!(_source),filters:!()${index},interval:auto,query:(language:kuery,query:''),sort:!())`;

    alert(path);
  }
}
