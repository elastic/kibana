/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultsDeep, isNil } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  ValidationResult,
  builtInComparators,
  builtInAggregationTypes,
  builtInGroupByTypes,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EsQueryRuleParams, SearchType } from './types';
import { isSearchSourceRule } from './util';
import {
  COMMON_EXPRESSION_ERRORS,
  ONLY_ES_QUERY_EXPRESSION_ERRORS,
  SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS,
} from './constants';

const validateCommonParams = (ruleParams: EsQueryRuleParams) => {
  const {
    size,
    threshold,
    timeWindowSize,
    thresholdComparator,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
  } = ruleParams;
  const errors: typeof COMMON_EXPRESSION_ERRORS = defaultsDeep({}, COMMON_EXPRESSION_ERRORS);

  if (!('index' in ruleParams) && !ruleParams.searchType) {
    errors.searchType.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredSearchType', {
        defaultMessage: 'Query type is required.',
      })
    );

    return errors;
  }

  if (aggType && builtInAggregationTypes[aggType].fieldRequired && !aggField) {
    errors.aggField.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredAggFieldText', {
        defaultMessage: 'Aggregation field is required.',
      })
    );
  }

  if (
    groupBy &&
    builtInGroupByTypes[groupBy] &&
    builtInGroupByTypes[groupBy].sizeRequired &&
    !termSize
  ) {
    errors.termSize.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTermSizedText', {
        defaultMessage: 'Term size is required.',
      })
    );
  }

  if (
    groupBy &&
    builtInGroupByTypes[groupBy].validNormalizedTypes &&
    builtInGroupByTypes[groupBy].validNormalizedTypes.length > 0 &&
    !termField
  ) {
    errors.termField.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTermFieldText', {
        defaultMessage: 'Term field is required.',
      })
    );
  }

  if (!threshold || threshold.length === 0 || threshold[0] === undefined) {
    errors.threshold0.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold 0 is required.',
      })
    );
  }
  if (
    thresholdComparator &&
    builtInComparators[thresholdComparator].requiredValues > 1 &&
    (!threshold ||
      threshold[1] === undefined ||
      (threshold && threshold.length < builtInComparators[thresholdComparator!].requiredValues))
  ) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold 1 is required.',
      })
    );
  }
  if (threshold && threshold.length === 2 && threshold[0] > threshold[1]) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.greaterThenThreshold0Text', {
        defaultMessage: 'Threshold 1 must be > Threshold 0.',
      })
    );
  }
  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }

  if (isNil(size)) {
    errors.size.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredSizeText', {
        defaultMessage: 'Size is required.',
      })
    );
  }
  if ((size && size < 0) || size > 10000) {
    errors.size.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.invalidSizeRangeText', {
        defaultMessage: 'Size must be between 0 and {max, number}.',
        values: { max: 10000 },
      })
    );
  }

  return errors;
};

const validateSearchSourceParams = (ruleParams: EsQueryRuleParams<SearchType.searchSource>) => {
  const errors: typeof SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS = defaultsDeep(
    {},
    SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS
  );

  if (!ruleParams.searchConfiguration) {
    errors.searchConfiguration.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredSearchConfiguration', {
        defaultMessage: 'Search source configuration is required.',
      })
    );
    return errors;
  }

  if (!ruleParams.searchConfiguration.index) {
    errors.searchConfiguration.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredDataViewText', {
        defaultMessage: 'Data view is required.',
      })
    );
    return errors;
  }

  if (!ruleParams.timeField) {
    errors.timeField.push(
      i18n.translate(
        'xpack.stackAlerts.esQuery.ui.validation.error.requiredDataViewTimeFieldText',
        {
          defaultMessage: 'Data view should have a time field.',
        }
      )
    );
    return errors;
  }

  return errors;
};

const validateEsQueryParams = (ruleParams: EsQueryRuleParams<SearchType.esQuery>) => {
  const errors: typeof ONLY_ES_QUERY_EXPRESSION_ERRORS = defaultsDeep(
    {},
    ONLY_ES_QUERY_EXPRESSION_ERRORS
  );

  if (!ruleParams.index || ruleParams.index.length === 0) {
    errors.index.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredIndexText', {
        defaultMessage: 'Index is required.',
      })
    );
  }

  if (!ruleParams.timeField) {
    errors.timeField.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }

  if (!ruleParams.esQuery) {
    errors.esQuery.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredQueryText', {
        defaultMessage: 'Elasticsearch query is required.',
      })
    );
  } else {
    try {
      const parsedQuery = JSON.parse(ruleParams.esQuery);
      if (!parsedQuery.query) {
        errors.esQuery.push(
          i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredEsQueryText', {
            defaultMessage: `Query field is required.`,
          })
        );
      }
    } catch (err) {
      errors.esQuery.push(
        i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.jsonQueryText', {
          defaultMessage: 'Query must be valid JSON.',
        })
      );
    }
  }
  return errors;
};

export const validateExpression = (ruleParams: EsQueryRuleParams): ValidationResult => {
  const validationResult = { errors: {} };

  const commonErrors = validateCommonParams(ruleParams);
  validationResult.errors = commonErrors;

  /**
   * Skip esQuery and index params check if it is search source rule,
   * since it should contain searchConfiguration instead of esQuery and index.
   *
   * It's important to report searchSource rule related errors only into errors.searchConfiguration prop.
   * For example errors.index is a mistake to report searchSource rule related errors. It will lead to issues.
   */
  const isSearchSource = isSearchSourceRule(ruleParams);
  if (isSearchSource) {
    validationResult.errors = {
      ...validationResult.errors,
      ...validateSearchSourceParams(ruleParams),
    };
    return validationResult;
  }

  const esQueryErrors = validateEsQueryParams(ruleParams as EsQueryRuleParams<SearchType.esQuery>);
  validationResult.errors = { ...validationResult.errors, ...esQueryErrors };
  return validationResult;
};

export const hasExpressionValidationErrors = (ruleParams: EsQueryRuleParams) => {
  const { errors: validationErrors } = validateExpression(ruleParams);
  return Object.keys(validationErrors).some(
    (key) => validationErrors[key] && validationErrors[key].length
  );
};
