/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverSetup } from '@kbn/discover-plugin/public';
import { Filter } from '@kbn/es-query';
import { TimeRange } from '@kbn/data-plugin/public';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common';

interface Context {
  embeddable: IEmbeddable;
  filters?: Filter[];
  timeRange?: TimeRange;
  openInSameTab?: boolean;
  hasDiscoverAccess: boolean;
  discover: Pick<DiscoverSetup, 'locator'>;
}

export function isLensEmbeddable(embeddable: IEmbeddable): embeddable is Embeddable {
  return embeddable.type === DOC_TYPE;
}

export async function isCompatible({ hasDiscoverAccess, embeddable }: Context) {
  if (!hasDiscoverAccess) return false;
  return isLensEmbeddable(embeddable) && (await embeddable.canViewUnderlyingData());
}

export function execute({ embeddable, discover, timeRange, filters, openInSameTab }: Context) {
  if (!isLensEmbeddable(embeddable)) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Can only be executed in the context of Lens visualization');
  }
  const args = embeddable.getViewUnderlyingDataArgs();
  if (!args) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Underlying data is not ready');
  }
  const discoverUrl = discover.locator?.getRedirectUrl({
    ...args,
    timeRange: timeRange || args.timeRange,
    filters: [...(filters || []), ...args.filters],
  });
  window.open(discoverUrl, !openInSameTab ? '_blank' : '_self');
}
