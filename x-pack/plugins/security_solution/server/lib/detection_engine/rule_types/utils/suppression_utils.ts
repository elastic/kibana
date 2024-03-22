/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pick from 'lodash/pick';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import objectHash from 'object-hash';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import type {
  BaseFieldsLatest,
  NewTermsFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, NewTermsRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from './reason_formatters';
import type { SignalSource } from '../types';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';

interface SuppressionTerm {
  field: string;
  value: string[] | number[] | null;
}

export const getSuppressionAlertFields = ({
  primaryTimestamp,
  secondaryTimestamp,
  fields,
  suppressionTerms,
  fallbackTimestamp,
  instanceId,
}: {
  fields: Record<string, string | number> | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  suppressionTerms: SuppressionTerm[];
  fallbackTimestamp: string;
  instanceId: string;
}) => {
  const suppressionTime = new Date(
    get(fields, primaryTimestamp) ??
      (secondaryTimestamp && get(fields, secondaryTimestamp)) ??
      fallbackTimestamp
  );

  const suppressionFields = {
    [ALERT_INSTANCE_ID]: instanceId,
    [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
    [ALERT_SUPPRESSION_START]: suppressionTime,
    [ALERT_SUPPRESSION_END]: suppressionTime,
    [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
  };

  return suppressionFields;
};

export const getSuppressionTerms = ({
  alertSuppression,
  fields,
}: {
  fields: Record<string, unknown> | undefined;
  alertSuppression: AlertSuppressionCamel | undefined;
}): SuppressionTerm[] => {
  const suppressedBy = alertSuppression?.groupBy ?? [];

  const suppressedProps = pick(fields, suppressedBy) as Record<
    string,
    string[] | number[] | undefined
  >;
  const suppressionTerms = suppressedBy.map((field) => {
    const value = suppressedProps[field] ?? null;
    const sortedValue = Array.isArray(value) ? (sortBy(value) as string[] | number[]) : value;
    return {
      field,
      value: sortedValue,
    };
  });

  return suppressionTerms;
};
