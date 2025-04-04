/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

export const hitToContent = ({
  hit,
  fields,
}: {
  hit: SearchHit;
  fields: string[];
}): Record<string, unknown> => {
  const content: Record<string, unknown> = {};

  fields.forEach((field) => {
    if (hit.highlight?.[field]) {
      content[field] = hit.highlight?.[field];
    } else {
      content[field] = get(hit._source ?? {}, field);
    }
  });

  return content;
};
