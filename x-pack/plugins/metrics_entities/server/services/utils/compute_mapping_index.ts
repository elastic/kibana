/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
