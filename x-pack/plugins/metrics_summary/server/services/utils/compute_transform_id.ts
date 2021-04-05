/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ELASTIC_NAME } from '../../../common';

export const computeTransformId = ({
  prefix,
  id,
  moduleName,
  suffix,
}: {
  prefix: string;
  id: string;
  moduleName: string;
  suffix: string;
}): string => {
  const prefixExists = prefix.trim() !== '';
  const suffixExists = suffix.trim() !== '';

  // TODO: Check for invalid characters on the main route for prefixExists and suffixExists and do an invalidation
  // if either have invalid characters for a job name. Might want to add that same check within the API too at a top level?
  if (prefixExists && suffixExists) {
    return `${ELASTIC_NAME}_${prefix}_${moduleName}_${id}_${suffix}`;
  } else if (prefixExists) {
    return `${ELASTIC_NAME}_${prefix}_${moduleName}_${id}`;
  } else if (suffixExists) {
    return `${ELASTIC_NAME}_${moduleName}_${id}_${suffix}`;
  } else {
    return `${ELASTIC_NAME}_${moduleName}_${id}`;
  }
};
