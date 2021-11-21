/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { exportExceptionDetails } from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

const createSchema = <Required extends t.Props, Optional extends t.Props>(
  requiredFields: Required,
  optionalFields: Optional
) => {
  return t.intersection([t.exact(t.type(requiredFields)), t.exact(t.partial(optionalFields))]);
};

export const exportRulesDetails = {
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
};

const exportRulesDetailsSchema = t.exact(t.type(exportRulesDetails));
export type ExportRulesDetailsSchema = t.TypeOf<typeof exportRulesDetailsSchema>;

// With exceptions
export const exportRulesDetailsWithExceptionsSchema = createSchema(
  exportRulesDetails,
  exportExceptionDetails
);

export type ExportRulesDetails = t.TypeOf<typeof exportRulesDetailsWithExceptionsSchema>;
