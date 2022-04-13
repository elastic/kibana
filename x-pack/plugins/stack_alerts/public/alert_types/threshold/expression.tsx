/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiCallOut, EuiEmptyPrompt, EuiText, EuiTitle } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  getFields,
  COMPARATORS,
  builtInComparators,
  OfExpression,
  ThresholdExpression,
  ForLastExpression,
  GroupByExpression,
  WhenExpression,
  builtInAggregationTypes,
  RuleTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { ThresholdVisualization } from './visualization';
import { IndexThresholdAlertParams } from './types';
import './expression.scss';
import { IndexSelectPopover } from '../components/index_select_popover';

export const DEFAULT_VALUES = {
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
  GROUP_BY: 'all',
};

const expressionFieldsWithValidation = [
  'index',
  'timeField',
  'aggField',
  'termSize',
  'termField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

interface KibanaDeps {
  http: HttpSetup;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// normalize the `index` parameter to be a string array
function indexParamToArray(index: string | string[]): string[] {
  if (!index) return [];
  return isString(index) ? [index] : index;
}

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<
  Omit<RuleTypeParamsExpressionProps<IndexThresholdAlertParams>, 'unifiedSearch'>
> = ({ ruleParams, ruleInterval, setRuleParams, setRuleProperty, errors, charts, data }) => {
  const {
    index,
    timeField,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = ruleParams;

  const indexArray = indexParamToArray(index);
  const { http } = useKibana<KibanaDeps>().services;

  const [esFields, setEsFields] = useState<
    Array<{
      name: string;
      type: string;
      normalizedType: string;
      searchable: boolean;
      aggregatable: boolean;
    }>
  >([]);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      ruleParams[errorKey as keyof IndexThresholdAlertParams] !== undefined
  );

  const cannotShowVisualization = !!Object.keys(errors).find(
    (errorKey) => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.threshold.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setRuleProperty('params', {
      ...ruleParams,
      aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
      termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    });

    if (indexArray.length > 0) {
      await refreshEsFields(indexArray);
    }
  };

  const refreshEsFields = async (indices: string[]) => {
    const currentEsFields = await getFields(http, indices);
    setEsFields(currentEsFields);
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.selectIndex"
            defaultMessage="Select an index"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <IndexSelectPopover
        index={indexArray}
        data-test-subj="indexSelectPopover"
        esFields={esFields}
        timeField={timeField}
        errors={errors}
        onIndexChange={async (indices: string[]) => {
          setRuleParams('index', indices);

          // reset expression fields if indices are deleted
          if (indices.length === 0) {
            setRuleProperty('params', {
              ...ruleParams,
              index: indices,
              aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
              termSize: DEFAULT_VALUES.TERM_SIZE,
              thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
              timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
              timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
              groupBy: DEFAULT_VALUES.GROUP_BY,
              threshold: DEFAULT_VALUES.THRESHOLD,
              timeField: '',
            });
          } else {
            await refreshEsFields(indices);
          }
        }}
        onTimeFieldChange={(updatedTimeField: string) =>
          setRuleParams('timeField', updatedTimeField)
        }
      />
      <WhenExpression
        display="fullWidth"
        data-test-subj="whenExpression"
        aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}
        onChangeSelectedAggType={(selectedAggType: string) =>
          setRuleParams('aggType', selectedAggType)
        }
      />
      {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
        <OfExpression
          aggField={aggField}
          data-test-subj="aggTypeExpression"
          fields={esFields}
          aggType={aggType}
          errors={errors}
          display="fullWidth"
          onChangeSelectedAggField={(selectedAggField?: string) =>
            setRuleParams('aggField', selectedAggField)
          }
        />
      ) : null}
      <GroupByExpression
        groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}
        data-test-subj="groupByExpression"
        termField={termField}
        termSize={termSize}
        errors={errors}
        fields={esFields}
        display="fullWidth"
        onChangeSelectedGroupBy={(selectedGroupBy) => setRuleParams('groupBy', selectedGroupBy)}
        onChangeSelectedTermField={(selectedTermField) =>
          setRuleParams('termField', selectedTermField)
        }
        onChangeSelectedTermSize={(selectedTermSize) => setRuleParams('termSize', selectedTermSize)}
      />
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.conditionPrompt"
            defaultMessage="Define the condition"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ThresholdExpression
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        threshold={threshold}
        data-test-subj="thresholdExpression"
        errors={errors}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedThreshold={(selectedThresholds) =>
          setRuleParams('threshold', selectedThresholds)
        }
        onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
          setRuleParams('thresholdComparator', selectedThresholdComparator)
        }
      />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE}
        timeWindowUnit={timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setRuleParams('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setRuleParams('timeWindowUnit', selectedWindowUnit)
        }
      />
      <EuiSpacer />
      <div className="actAlertVisualization__chart">
        {cannotShowVisualization ? (
          <Fragment>
            <EuiEmptyPrompt
              data-test-subj="visualizationPlaceholder"
              iconType="visBarVertical"
              body={
                <EuiText color="subdued">
                  <FormattedMessage
                    id="xpack.stackAlerts.threshold.ui.previewAlertVisualizationDescription"
                    defaultMessage="Complete the expression to generate a preview."
                  />
                </EuiText>
              }
            />
          </Fragment>
        ) : (
          <Fragment>
            <ThresholdVisualization
              data-test-subj="thresholdVisualization"
              ruleParams={ruleParams}
              alertInterval={ruleInterval}
              aggregationTypes={builtInAggregationTypes}
              comparators={builtInComparators}
              charts={charts}
              dataFieldsFormats={data!.fieldFormats}
            />
          </Fragment>
        )}
      </div>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexThresholdAlertTypeExpression as default };
