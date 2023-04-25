/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const RotateKeyPairSchema = {
  query: schema.maybe(
    schema.object(
      {
        acknowledge: schema.boolean({
          defaultValue: false,
        }),
      },
      {
        defaultValue: { acknowledge: false },
        validate: (value: { acknowledge: boolean }) => {
          if (!value || !value.acknowledge) {
            throw new Error(
              'You must acknowledge the risks of rotating the key pair with acknowledge=true in the request parameters.'
            );
          }
        },
      }
    )
  ),
};
