/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

/** @internal */
export class SpacesConfig {
  public static schema = schema.object({
    maxSpaces: schema.number({ defaultValue: 1000 }),
  });

  public readonly maxSpaces: number;

  constructor(config: TypeOf<typeof SpacesConfig['schema']>) {
    this.maxSpaces = config.maxSpaces;
  }
}
