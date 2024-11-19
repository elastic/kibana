/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { EuiSelectOption } from '@elastic/eui';
import type { Type, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import * as i18n from './translations';

import type { FieldValueQueryBar } from '../query_field';
import type { TimeframePreviewOptions } from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { MAX_NUMBER_OF_NEW_TERMS_FIELDS } from '../../../../../common/constants';

/**
 * Determines whether or not to display noise warning.
 * Is considered noisy if alerts/hour rate > 1
 * @param hits Total query search hits
 * @param timeframe Range selected by user (last hour, day...)
 */
export const isNoisy = (hits: number, timeframe: TimeframePreviewOptions): boolean => {
  const oneHour = 1000 * 60 * 60;
  const durationInHours = Math.max(
    (timeframe.timeframeEnd.valueOf() - timeframe.timeframeStart.valueOf()) / oneHour,
    1.0
  );
  return hits / durationInHours > 1;
};

/**
 * Determines what timerange options to show.
 * Eql sequence queries tend to be slower, so decided
 * not to include the last month option.
 * @param ruleType
 */
export const getTimeframeOptions = (ruleType: Type): EuiSelectOption[] => {
  if (ruleType === 'eql') {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
    ];
  } else if (ruleType === 'threat_match') {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'w', text: i18n.LAST_WEEK },
    ];
  } else if (ruleType === 'threshold') {
    return [{ value: 'h', text: i18n.LAST_HOUR }];
  } else {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'M', text: i18n.LAST_MONTH },
    ];
  }
};

const isNewTermsPreviewDisabled = (newTermsFields: string[]): boolean => {
  return newTermsFields.length === 0 || newTermsFields.length > MAX_NUMBER_OF_NEW_TERMS_FIELDS;
};

const isEsqlPreviewDisabled = ({
  isQueryBarValid,
  queryBar,
}: {
  queryBar: FieldValueQueryBar;
  isQueryBarValid: boolean;
}): boolean => {
  return !isQueryBarValid || isEmpty(queryBar.query.query);
};

const isThreatMatchPreviewDisabled = ({
  isThreatQueryBarValid,
  threatIndex,
  threatMapping,
}: {
  threatIndex: string[];
  threatMapping: ThreatMapping;
  isThreatQueryBarValid: boolean;
}): boolean => {
  if (!isThreatQueryBarValid || !threatIndex.length || !threatMapping) {
    return true;
  } else if (
    !threatMapping.length ||
    !threatMapping[0].entries?.length ||
    !threatMapping[0].entries[0].field ||
    !threatMapping[0].entries[0].value
  ) {
    return true;
  }

  return false;
};

export const getIsRulePreviewDisabled = ({
  ruleType,
  isQueryBarValid,
  isThreatQueryBarValid,
  index,
  dataViewId,
  dataSourceType,
  threatIndex,
  threatMapping,
  machineLearningJobId,
  queryBar,
  newTermsFields,
}: {
  ruleType: Type;
  isQueryBarValid: boolean;
  isThreatQueryBarValid: boolean;
  index: string[];
  dataViewId: string | undefined;
  dataSourceType: DataSourceType;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  machineLearningJobId: string[];
  queryBar: FieldValueQueryBar;
  newTermsFields: string[];
}) => {
  if (ruleType === 'esql') {
    return isEsqlPreviewDisabled({ isQueryBarValid, queryBar });
  }
  if (ruleType === 'machine_learning') {
    return machineLearningJobId.length === 0;
  }
  if (
    !isQueryBarValid ||
    (dataSourceType === DataSourceType.DataView && !dataViewId) ||
    (dataSourceType === DataSourceType.IndexPatterns && index.length === 0)
  ) {
    return true;
  }
  if (ruleType === 'threat_match') {
    return isThreatMatchPreviewDisabled({
      threatIndex,
      threatMapping,
      isThreatQueryBarValid,
    });
  }
  if (ruleType === 'eql' || ruleType === 'query' || ruleType === 'threshold') {
    return isEmpty(queryBar.query.query) && isEmpty(queryBar.filters);
  }
  if (ruleType === 'new_terms') {
    return isNewTermsPreviewDisabled(newTermsFields);
  }
  return false;
};
