/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  firstFieldOption,
  getIndexPatterns,
  getIndexOptions,
  getFields,
  COMPARATORS,
  builtInComparators,
  getTimeFieldOptions,
  OfExpression,
  ThresholdExpression,
  ForLastExpression,
  GroupByExpression,
  WhenExpression,
  builtInAggregationTypes,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { ThresholdVisualization } from './visualization';
import { IndexThresholdAlertParams } from './types';
import './expression.scss';

const DEFAULT_VALUES = {
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

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<IndexThresholdAlertParams>
> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, charts, data }) => {
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
  } = alertParams;

  const { http } = useKibana<KibanaDeps>().services;

  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [esFields, setEsFields] = useState<unknown[]>([]);
  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      alertParams[errorKey as keyof IndexThresholdAlertParams] !== undefined
  );

  const canShowVizualization = !!Object.keys(errors).find(
    (errorKey) => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.threshold.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setAlertProperty('params', {
      ...alertParams,
      aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
      termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    });

    if (index && index.length > 0) {
      const currentEsFields = await getFields(http, index);
      const timeFields = getTimeFieldOptions(currentEsFields);

      setEsFields(currentEsFields);
      setTimeFieldOptions([firstFieldOption, ...timeFields]);
    }
  };

  const closeIndexPopover = () => {
    setIndexPopoverOpen(false);
    if (timeField === undefined) {
      setAlertParams('timeField', '');
    }
  };

  useEffect(() => {
    const indexPatternsFunction = async () => {
      setIndexPatterns(await getIndexPatterns());
    };
    indexPatternsFunction();
  }, []);

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexPopover = (
    <Fragment>
      <EuiFormRow
        id="indexSelectSearchBox"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.alertParams.indicesToQueryLabel"
            defaultMessage="Indices to query"
          />
        }
        isInvalid={errors.index.length > 0 && index !== undefined}
        error={errors.index}
        helpText={
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.alertParams.howToBroadenSearchQueryDescription"
            defaultMessage="Use * to broaden your query."
          />
        }
      >
        <EuiComboBox
          fullWidth
          async
          isLoading={isIndiciesLoading}
          isInvalid={errors.index.length > 0 && index !== undefined}
          noSuggestions={!indexOptions.length}
          options={indexOptions}
          data-test-subj="thresholdIndexesComboBox"
          selectedOptions={(index || []).map((anIndex: string) => {
            return {
              label: anIndex,
              value: anIndex,
            };
          })}
          onChange={async (selected: EuiComboBoxOptionOption[]) => {
            const indicies: string[] = selected
              .map((aSelected) => aSelected.value)
              .filter<string>(isString);
            setAlertParams('index', indicies);
            const indices = selected.map((s) => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFieldOptions([firstFieldOption]);
              setAlertProperty('params', {
                ...alertParams,
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
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            const timeFields = getTimeFieldOptions(currentEsFields);

            setEsFields(currentEsFields);
            setTimeFieldOptions([firstFieldOption, ...timeFields]);
          }}
          onSearchChange={async (search) => {
            setIsIndiciesLoading(true);
            setIndexOptions(await getIndexOptions(http!, search, indexPatterns));
            setIsIndiciesLoading(false);
          }}
          onBlur={() => {
            if (!index) {
              setAlertParams('index', []);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="thresholdTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.alertParams.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
        isInvalid={errors.timeField.length > 0 && timeField !== undefined}
        error={errors.timeField}
      >
        <EuiSelect
          options={timeFieldOptions}
          isInvalid={errors.timeField.length > 0 && timeField !== undefined}
          fullWidth
          name="thresholdTimeField"
          data-test-subj="thresholdAlertTimeFieldSelect"
          value={timeField}
          onChange={(e) => {
            setAlertParams('timeField', e.target.value);
          }}
          onBlur={() => {
            if (timeField === undefined) {
              setAlertParams('timeField', '');
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );

  const renderIndices = (indices: string[]) => {
    const rows = indices.map((s: string, i: number) => {
      return (
        <p key={i}>
          {s}
          {i < indices.length - 1 ? ',' : null}
        </p>
      );
    });
    return <div>{rows}</div>;
  };

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
      <EuiPopover
        id="indexPopover"
        button={
          <EuiExpression
            display="columns"
            data-test-subj="selectIndexExpression"
            description={i18n.translate('xpack.stackAlerts.threshold.ui.alertParams.indexLabel', {
              defaultMessage: 'index',
            })}
            value={index && index.length > 0 ? renderIndices(index) : firstFieldOption.text}
            isActive={indexPopoverOpen}
            onClick={() => {
              setIndexPopoverOpen(true);
            }}
            isInvalid={!(index && index.length > 0 && timeField !== '')}
          />
        }
        isOpen={indexPopoverOpen}
        closePopover={closeIndexPopover}
        ownFocus
        anchorPosition="downLeft"
        zIndex={8000}
        display="block"
      >
        <div style={{ width: '450px' }}>
          <EuiPopoverTitle>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                {i18n.translate('xpack.stackAlerts.threshold.ui.alertParams.indexButtonLabel', {
                  defaultMessage: 'index',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="closePopover"
                  iconType="cross"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.stackAlerts.threshold.ui.alertParams.closeIndexPopoverLabel',
                    {
                      defaultMessage: 'Close',
                    }
                  )}
                  onClick={closeIndexPopover}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>

          {indexPopover}
        </div>
      </EuiPopover>
      <WhenExpression
        display="fullWidth"
        aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}
        onChangeSelectedAggType={(selectedAggType: string) =>
          setAlertParams('aggType', selectedAggType)
        }
      />
      {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
        <OfExpression
          aggField={aggField}
          fields={esFields}
          aggType={aggType}
          errors={errors}
          display="fullWidth"
          onChangeSelectedAggField={(selectedAggField?: string) =>
            setAlertParams('aggField', selectedAggField)
          }
        />
      ) : null}
      <GroupByExpression
        groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}
        termField={termField}
        termSize={termSize}
        errors={errors}
        fields={esFields}
        display="fullWidth"
        onChangeSelectedGroupBy={(selectedGroupBy) => setAlertParams('groupBy', selectedGroupBy)}
        onChangeSelectedTermField={(selectedTermField) =>
          setAlertParams('termField', selectedTermField)
        }
        onChangeSelectedTermSize={(selectedTermSize) =>
          setAlertParams('termSize', selectedTermSize)
        }
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
        errors={errors}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedThreshold={(selectedThresholds) =>
          setAlertParams('threshold', selectedThresholds)
        }
        onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
          setAlertParams('thresholdComparator', selectedThresholdComparator)
        }
      />
      <ForLastExpression
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setAlertParams('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setAlertParams('timeWindowUnit', selectedWindowUnit)
        }
      />
      <EuiSpacer />
      <div className="actAlertVisualization__chart">
        {canShowVizualization ? (
          <Fragment>
            <EuiEmptyPrompt
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
              alertParams={alertParams}
              alertInterval={alertInterval}
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
