/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import type { LanguageOrUndefined } from '@kbn/securitysolution-io-ts-alerting-types';

import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export const getFieldsForWildcard = async ({
  index,
  dataViews,
  language,
  ruleExecutionLogger,
}: {
  index: string[] | undefined;
  language: LanguageOrUndefined;
  dataViews: DataViewsContract;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}): Promise<FieldSpec[]> => {
  if (!index || language !== 'kuery') {
    return [];
  }

  try {
    const fields = await dataViews.getFieldsForWildcard({
      pattern: index.join(),
      allowNoIndex: true,
    });

    return fields;
  } catch (e) {
    ruleExecutionLogger.error(`Failed to fetch index fields: ${e?.message}`);
    return [];
  }
};
