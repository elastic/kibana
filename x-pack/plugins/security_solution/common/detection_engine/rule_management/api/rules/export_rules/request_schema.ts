/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DefaultExportFileName } from '@kbn/securitysolution-io-ts-alerting-types';
import { DefaultStringBooleanFalse } from '@kbn/securitysolution-io-ts-types';

import type { FileName, ExcludeExportDetails } from '../../../../schemas/common/schemas';
import { RuleSignatureId } from '../../../../rule_schema';

const ObjectsWithRuleId = t.array(t.exact(t.type({ rule_id: RuleSignatureId })));

/**
 * Request body parameters of the API route.
 */
export type ExportRulesRequestBody = t.TypeOf<typeof ExportRulesRequestBody>;
export const ExportRulesRequestBody = t.union([
  t.exact(t.type({ objects: ObjectsWithRuleId })),
  t.null,
]);

/**
 * Query string parameters of the API route.
 */
export type ExportRulesRequestQuery = t.TypeOf<typeof ExportRulesRequestQuery>;
export const ExportRulesRequestQuery = t.exact(
  t.partial({ file_name: DefaultExportFileName, exclude_export_details: DefaultStringBooleanFalse })
);

export type ExportRulesRequestQueryDecoded = Omit<
  ExportRulesRequestQuery,
  'file_name' | 'exclude_export_details'
> & {
  file_name: FileName;
  exclude_export_details: ExcludeExportDetails;
};
