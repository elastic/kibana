/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, Type } from '@kbn/config-schema';

// TODO: remove once this is merged:  https://github.com/elastic/kibana/pull/41728

export function nullableType<V>(type: Type<V>) {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: () => null });
}
