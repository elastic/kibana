/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { DefaultExportFileName } from '@kbn/securitysolution-io-ts-alerting-types';
import { DefaultStringBooleanFalse } from '@kbn/securitysolution-io-ts-types';
import { RuleSignatureId } from '../../../../rule_schema';
import type { FileName, ExcludeExportDetails } from '../../../../schemas/common/schemas';

const objects = t.array(t.exact(t.type({ rule_id: RuleSignatureId })));
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
