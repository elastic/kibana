/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';

export const getFieldsForWildcard = async ({
  index,
  dataViews,
}: {
  index: string[];
  dataViews: DataViewsContract;
}): Promise<FieldSpec[]> => {
  const fields = await dataViews.getFieldsForWildcard({
    pattern: index.join(),
    allowNoIndex: true,
  });

  return fields;
};
