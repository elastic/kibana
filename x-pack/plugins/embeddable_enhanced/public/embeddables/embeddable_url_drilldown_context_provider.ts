/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsEnhancedUrlDrilldownContextProvider } from '../../../ui_actions_enhanced/public';
import { Query, Filter, TimeRange } from '../../../../../src/plugins/data/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';

function hasEmbeddable(val: unknown): val is { embeddable: IEmbeddable } {
  if (val && typeof val === 'object' && 'embeddable' in val) return true;
  return false;
}

interface EmbeddableUrlDrilldownContext {
  embeddableId: string;
  embeddableTitle?: string;
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
}

export const embeddableUrlDrilldownContextProvider: UiActionsEnhancedUrlDrilldownContextProvider<EmbeddableUrlDrilldownContext> = {
  injectedKeys: [
    'embeddableId',
    'embeddableTitle',
    'query',
    'timeRange',
    'filters',
    'savedObjectId',
  ],
  injectContext(executionContext: unknown) {
    if (hasEmbeddable(executionContext)) {
      const embeddable = executionContext.embeddable;
      const input = embeddable.getInput();
      const output = embeddable.getOutput();
      return {
        embeddableId: input.id,
        embeddableTitle: output.title ?? input.title,
        ..._.pick(input, ['query', 'timeRange', 'filters']),
        ...(output.savedObjectId
          ? { savedObjectId: output.savedObjectId }
          : _.pick(input, 'savedObjectId')),
      };
    }
  },
};
