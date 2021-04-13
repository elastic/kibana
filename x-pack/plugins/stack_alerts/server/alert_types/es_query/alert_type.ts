/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EsQueryAlertParams } from './alert_type_params';
import { parseDuration } from '../../../../alerting/server';

export const ID = '.es-query';

export const RuleTypeActionGroupId = 'query matched';
export const ConditionMetAlertInstanceId = 'query matched';

export const RuleTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
  defaultMessage: 'Elasticsearch query',
});

export const RuleTypeActionGroupName = i18n.translate(
  'xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle',
  {
    defaultMessage: 'Query matched',
  }
);

export const actionVariableContextDateLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
  {
    defaultMessage: 'The date that the alert met the threshold condition.',
  }
);

export const actionVariableContextValueLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
  {
    defaultMessage: 'The value that met the threshold condition.',
  }
);

export const actionVariableContextHitsLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextHitsLabel',
  {
    defaultMessage: 'The documents that met the threshold condition.',
  }
);

export const actionVariableContextMessageLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
  {
    defaultMessage: 'A message for the alert.',
  }
);

export const actionVariableContextTitleLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
  {
    defaultMessage: 'A title for the alert.',
  }
);

export const actionVariableContextIndexLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextIndexLabel',
  {
    defaultMessage: 'The index the query was run against.',
  }
);

export const actionVariableContextQueryLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextQueryLabel',
  {
    defaultMessage: 'The string representation of the Elasticsearch query.',
  }
);

export const actionVariableContextSizeLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextSizeLabel',
  {
    defaultMessage: 'The number of hits to retrieve for each query.',
  }
);

export const actionVariableContextThresholdLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextThresholdLabel',
  {
    defaultMessage:
      "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
  }
);

export const actionVariableContextThresholdComparatorLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextThresholdComparatorLabel',
  {
    defaultMessage: 'A function to determine if the threshold has been met.',
  }
);

export const actionVariableContextConditionsLabel = i18n.translate(
  'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
  {
    defaultMessage: 'A string that describes the threshold condition.',
  }
);

export function getValidTimefieldSort(
  sortValues: Array<string | number | null> = []
): undefined | string {
  for (const sortValue of sortValues) {
    const sortDate = tryToParseAsDate(sortValue);
    if (sortDate) {
      return sortDate;
    }
  }
}

export function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}

export function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

function getInvalidWindowSizeError(windowValue: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidWindowSizeErrorMessage', {
    defaultMessage: 'invalid format for windowSize: "{windowValue}"',
    values: {
      windowValue,
    },
  });
}

function getInvalidQueryError(query: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidQueryErrorMessage', {
    defaultMessage: 'invalid query specified: "{query}" - query must be JSON',
    values: {
      query,
    },
  });
}

export function getSearchParams(queryParams: EsQueryAlertParams) {
  const date = Date.now();
  const { esQuery, timeWindowSize, timeWindowUnit } = queryParams;

  let parsedQuery;
  try {
    parsedQuery = JSON.parse(esQuery);
  } catch (err) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  if (parsedQuery && !parsedQuery.query) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  const window = `${timeWindowSize}${timeWindowUnit}`;
  let timeWindow: number;
  try {
    timeWindow = parseDuration(window);
  } catch (err) {
    throw new Error(getInvalidWindowSizeError(window));
  }

  const dateStart = new Date(date - timeWindow).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { parsedQuery, dateStart, dateEnd };
}
