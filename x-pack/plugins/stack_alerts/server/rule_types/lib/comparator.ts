/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { Comparator } from '../../../common/comparator_types';

export const getComparatorSchemaType = (validate: (comparator: Comparator) => string | void) =>
  schema.oneOf(
    [
      schema.literal(Comparator.GT),
      schema.literal(Comparator.LT),
      schema.literal(Comparator.GT_OR_EQ),
      schema.literal(Comparator.LT_OR_EQ),
      schema.literal(Comparator.BETWEEN),
      schema.literal(Comparator.NOT_BETWEEN),
    ],
    { validate }
  );
