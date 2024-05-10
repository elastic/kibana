/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { HttpSetup } from '@kbn/core/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

export async function fetchAlertFields({
  http,
  featureIds,
}: {
  http: HttpSetup;
  featureIds: ValidFeatureId[];
}): Promise<FieldSpec[]> {
  const { fields: alertFields = [] } = await http.get<{ fields: FieldSpec[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { featureIds },
    }
  );
  return alertFields;
}
