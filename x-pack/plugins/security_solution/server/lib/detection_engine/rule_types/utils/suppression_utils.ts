/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pick from 'lodash/pick';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import isEmpty from 'lodash/isEmpty';

import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { SignalSourceHit } from '../types';

export interface SuppressionTerm {
  field: string;
  value: string[] | number[] | null;
}

/**
 * returns an object containing the standard suppression fields (ALERT_INSTANCE_ID, ALERT_SUPPRESSION_TERMS, etc), with corresponding values populated from the `fields` parameter.
 */
export const getSuppressionAlertFields = ({
  primaryTimestamp,
  secondaryTimestamp,
  fields,
  suppressionTerms,
  fallbackTimestamp,
  instanceId,
}: {
  fields: Record<string, unknown> | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  suppressionTerms: SuppressionTerm[];
  fallbackTimestamp: string;
  instanceId: string;
}) => {
  console.error(
    `primary timestamp: ${primaryTimestamp}, secondaryTimestamp: ${secondaryTimestamp}, fallbackTimestamp: ${fallbackTimestamp}`
  );
  console.error('WHAT ARE FIELDS', JSON.stringify(fields));
  const suppressionTime = new Date(
    get(fields, primaryTimestamp) ??
      (secondaryTimestamp && get(fields, secondaryTimestamp)) ??
      fallbackTimestamp
  );

  // console.error('SUPPRESSION TIME');

  const suppressionFields = {
    [ALERT_INSTANCE_ID]: instanceId,
    [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
    [ALERT_SUPPRESSION_START]: suppressionTime,
    [ALERT_SUPPRESSION_END]: suppressionTime,
    [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
  };

  console.error('WHAT ARE THE SUPPRESSION FIELDS', JSON.stringify(suppressionFields));

  return suppressionFields;
};

/**
 * returns an array of {@link SuppressionTerm}s by retrieving the appropriate field values based on the provided alertSuppression configuration
 */
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
    const value = get(suppressedProps, field) ?? null;
    const sortedValue = Array.isArray(value) ? (sortBy(value) as string[] | number[]) : value;
    return {
      field,
      value: sortedValue,
    };
  });

  return suppressionTerms;
};
