/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyType, ConditionalType, Type, schema } from '@kbn/config-schema';
import { datatableVisualizationStateSchema } from './visualization_state/data_table';
import { getLensAttributesSchema } from './common';

function buildConditionalSchema(conditions: Array<{ type: string; schema: Type<any> }>) {
  return conditions.reduce<ConditionalType<string, Type<any>, Type<any>> | AnyType>(
    (acc, condition) => {
      return schema.conditional(
        schema.siblingRef('.visualizationType'),
        condition.type,
        condition.schema,
        acc
      );
    },
    // Fall back to no validation. Change to schema.never() to enforce validation.
    schema.any()
  );
}

export const getSchema = () =>
  schema.object({
    attributes: buildConditionalSchema([
      {
        type: 'lnsDatatable',
        schema: getLensAttributesSchema('lnsDatatable', datatableVisualizationStateSchema),
      },
      // TODO create schemas for other visualization types
    ]),
  });
