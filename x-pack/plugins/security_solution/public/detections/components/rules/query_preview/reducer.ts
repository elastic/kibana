/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@elastic/datemath';
import { EuiSelectOption } from '@elastic/eui';

import { Type, Language } from '@kbn/securitysolution-io-ts-alerting-types';
import * as i18n from './translations';
import { Filter } from '../../../../../../../../src/plugins/data/common/es_query';
import { ESQuery } from '../../../../../common/typed_json';
import { FieldValueQueryBar } from '../query_bar';
import { formatDate } from '../../../../common/components/super_date_picker';
import { getInfoFromQueryBar, getTimeframeOptions } from './helpers';
import { Threshold } from '.';

export interface State {
  timeframeOptions: EuiSelectOption[];
  showHistogram: boolean;
  timeframe: Unit;
  warnings: string[];
  queryFilter: ESQuery | undefined;
  toTime: string;
  fromTime: string;
  queryString: string;
  language: Language;
  filters: Filter[];
  thresholdFieldExists: boolean;
  showNonEqlHistogram: boolean;
}

export type Action =
  | {
      type: 'setQueryInfo';
      queryBar: FieldValueQueryBar | undefined;
      index: string[];
      ruleType: Type;
    }
  | {
      type: 'setTimeframeSelect';
      timeframe: Unit;
    }
  | {
      type: 'setResetRuleTypeChange';
      ruleType: Type;
    }
  | {
      type: 'setWarnings';
      warnings: string[];
    }
  | {
      type: 'setShowHistogram';
      show: boolean;
    }
  | {
      type: 'setThresholdQueryVals';
      threshold: Threshold;
      ruleType: Type;
    }
  | {
      type: 'setNoiseWarning';
    }
  | {
      type: 'setToFrom';
    };

export const queryPreviewReducer =
  () =>
  (state: State, action: Action): State => {
    switch (action.type) {
      case 'setQueryInfo': {
        if (action.queryBar != null) {
          const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
            action.queryBar,
            action.index,
            action.ruleType
          );

          return {
            ...state,
            queryString,
            language,
            filters,
            queryFilter,
            showHistogram: false,
          };
        }

        return {
          ...state,
          showHistogram: false,
        };
      }
      case 'setTimeframeSelect': {
        return {
          ...state,
          timeframe: action.timeframe,
          showHistogram: false,
          warnings: [],
        };
      }
      case 'setResetRuleTypeChange': {
        const showNonEqlHist =
          action.ruleType === 'query' ||
          action.ruleType === 'saved_query' ||
          (action.ruleType === 'threshold' && !state.thresholdFieldExists);

        return {
          ...state,
          showHistogram: false,
          timeframe: 'h',
          timeframeOptions: getTimeframeOptions(action.ruleType),
          showNonEqlHistogram: showNonEqlHist,
          warnings: [],
        };
      }
      case 'setWarnings': {
        return {
          ...state,
          warnings: action.warnings,
        };
      }
      case 'setShowHistogram': {
        return {
          ...state,
          showHistogram: action.show,
        };
      }
      case 'setThresholdQueryVals': {
        const thresholdField =
          action.threshold != null &&
          action.threshold.field != null &&
          action.threshold.field.length > 0 &&
          action.threshold.field.every((field) => field.trim() !== '');
        const showNonEqlHist =
          action.ruleType === 'query' ||
          action.ruleType === 'saved_query' ||
          (action.ruleType === 'threshold' && !thresholdField);

        return {
          ...state,
          thresholdFieldExists: thresholdField,
          showNonEqlHistogram: showNonEqlHist,
          showHistogram: false,
          warnings: [],
        };
      }
      case 'setToFrom': {
        return {
          ...state,
          fromTime: formatDate('now'),
          toTime: formatDate(`now-1${state.timeframe}`),
        };
      }
      case 'setNoiseWarning': {
        return {
          ...state,
          warnings: [...state.warnings, i18n.QUERY_PREVIEW_NOISE_WARNING],
        };
      }
      default:
        return state;
    }
  };
