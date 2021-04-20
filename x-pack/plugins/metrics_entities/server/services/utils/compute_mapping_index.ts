/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeTransformId } from './compute_transform_id';

export const computeMappingId = ({
  prefix,
  id,
  suffix,
}: {
  prefix: string;
  id: string;
  suffix: string;
}): string => {
  const computedId = computeTransformId({ id, prefix, suffix });
  return `.${computedId}`;
};
