/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { exportExceptionDetailsSchema } from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export const exportRulesDetailsSchema = t.intersection([
  t.exact(
    t.type({
      exported_count: t.number,
      exported_rules_count: t.number,
      missing_rules: t.array(
        t.exact(
          t.type({
            rule_id: NonEmptyString,
          })
        )
      ),
      missing_rules_count: t.number,
    })
  ),
  t.exact(t.partial(exportExceptionDetailsSchema)),
]);

export type ExportRulesDetails = t.TypeOf<typeof exportRulesDetailsSchema>;
