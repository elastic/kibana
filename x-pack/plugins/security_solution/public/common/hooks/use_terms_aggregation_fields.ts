/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import { getTermsAggregationFields } from '../../detection_engine/rule_creation_ui/components/step_define_rule/utils';

export function useTermsAggregationFields(fields?: DataViewFieldBase[]) {
  const termsAggregationFields = useMemo(
    /**
     * Typecasting to FieldSpec because fields is
     * typed as DataViewFieldBase[] which does not have
     * the 'aggregatable' property, however the type is incorrect
     *
     * fields does contain elements with the aggregatable property.
     * We will need to determine where these types are defined and
     * figure out where the discrepancy is.
     */
    () => getTermsAggregationFields((fields as FieldSpec[]) ?? []),
    [fields]
  );

  return termsAggregationFields;
}
