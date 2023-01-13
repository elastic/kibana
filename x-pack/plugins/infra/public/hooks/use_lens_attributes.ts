/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter, Query } from '@kbn/es-query';
import { LensAttributes } from '../types';

interface UseLensAttributesParams {
  dataView: DataView | undefined;
  filters: Filter[];
  attributes: LensAttributes;
  query: Query;
  title?: string;
}

export const useLensAttributes = ({
  dataView,
  filters = [],
  attributes,
  query,
  title,
}: UseLensAttributesParams): LensAttributes | null => {
  const lensAttrsWithInjectedData = useMemo(() => {
    if (!dataView?.id) {
      return null;
    }

    return {
      ...attributes,
      ...(title != null ? { title } : {}),
      state: {
        ...attributes.state,
        query,
        filters: [...attributes.state.filters, ...filters],
      },
      references: attributes.references.map((ref: { id: string; name: string; type: string }) => ({
        ...ref,
        id: dataView.id,
      })),
    } as LensAttributes;
  }, [dataView?.id, attributes, title, filters, query]);

  return lensAttrsWithInjectedData;
};
