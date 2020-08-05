/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { rule_id, FileName, ExcludeExportDetails } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DefaultExportFileName } from '../types/default_export_file_name';
import { DefaultStringBooleanFalse } from '../types/default_string_boolean_false';

const objects = t.array(t.exact(t.type({ rule_id })));
export const exportRulesSchema = t.union([t.exact(t.type({ objects })), t.null]);
export type ExportRulesSchema = t.TypeOf<typeof exportRulesSchema>;
export type ExportRulesSchemaDecoded = ExportRulesSchema;

export const exportRulesQuerySchema = t.exact(
  t.partial({ file_name: DefaultExportFileName, exclude_export_details: DefaultStringBooleanFalse })
);

export type ExportRulesQuerySchema = t.TypeOf<typeof exportRulesQuerySchema>;

export type ExportRulesQuerySchemaDecoded = Omit<
  ExportRulesQuerySchema,
  'file_name' | 'exclude_export_details'
> & {
  file_name: FileName;
  exclude_export_details: ExcludeExportDetails;
};
