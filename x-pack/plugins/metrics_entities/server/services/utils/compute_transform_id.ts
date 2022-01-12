/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_NAME } from '../../../common/constants';

export const computeTransformId = ({
  prefix,
  id,
  suffix,
}: {
  prefix: string;
  id: string;
  suffix: string;
}): string => {
  const prefixExists = prefix.trim() !== '';
  const suffixExists = suffix.trim() !== '';

  // TODO: Check for invalid characters on the main route for prefixExists and suffixExists and do an invalidation
  // if either have invalid characters for a job name. Might want to add that same check within the API too at a top level?
  if (prefixExists && suffixExists) {
    return `${ELASTIC_NAME}_${prefix}_${id}_${suffix}`;
  } else if (prefixExists) {
    return `${ELASTIC_NAME}_${prefix}_${id}`;
  } else if (suffixExists) {
    return `${ELASTIC_NAME}_${id}_${suffix}`;
  } else {
    return `${ELASTIC_NAME}_${id}`;
  }
};
