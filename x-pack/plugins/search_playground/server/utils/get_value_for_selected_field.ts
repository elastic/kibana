/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { get } from 'lodash';

export const getValueForSelectedField = (hit: SearchHit, path: string): string => {
  if (!hit) {
    return '';
  }

  // for semantic_text matches
  const innerHitPath = `${hit._index}.${path}`;
  if (!!hit.inner_hits?.[innerHitPath]) {
    return hit.inner_hits[innerHitPath].hits.hits
      .map((innerHit) => innerHit._source.text)
      .join('\n --- \n');
  }

  return get(hit._source, path, '');
};
