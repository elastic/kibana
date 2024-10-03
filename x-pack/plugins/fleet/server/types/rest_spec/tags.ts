/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { validateKuery } from '../../routes/utils/filter_utils';

import { AGENTS_PREFIX, AGENT_MAPPINGS } from '../../constants';

export const GetTagsRequestSchema = {
  query: schema.object({
    kuery: schema.maybe(
      schema.string({
        validate: (value: string) => {
          const validationObj = validateKuery(value, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
          if (validationObj?.error) {
            return validationObj?.error;
          }
        },
      })
    ),
    showInactive: schema.boolean({ defaultValue: false }),
  }),
};

export const GetTagsResponseSchema = schema.object({
  items: schema.arrayOf(schema.string()),
});
