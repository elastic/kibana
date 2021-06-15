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
  // TODO: This causes issues if above 65 character limit. We should limit the prefix
  // and anything else on the incoming routes to avoid this causing an issue. We should still
  // throw here in case I change the prefix or other names and cause issues.
  const computedId = computeTransformId({ id, prefix, suffix });
  return `.${computedId}`;
};
