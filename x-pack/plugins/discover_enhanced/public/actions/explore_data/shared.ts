/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { apiPublishesDataViews, EmbeddableApiContext } from '@kbn/presentation-publishing';

export const getDataViews = (embeddable: EmbeddableApiContext['embeddable']): string[] => {
  if (!apiPublishesDataViews(embeddable)) return [];

  const dataViews: DataView[] = embeddable.dataViews.getValue() ?? [];
  return dataViews.reduce(
    (prev: string[], current: DataView) => (current.id ? [...prev, current.id] : prev),
    []
  );
};

export const hasExactlyOneDataView = (embeddable: EmbeddableApiContext['embeddable']): boolean =>
  getDataViews(embeddable).length === 1;
