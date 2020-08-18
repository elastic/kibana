/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBoxOptionOption,
  EuiEmptyPrompt,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../types';
import { GeoThresholdAlertParams, TrackingEvent } from './types';
import { AlertsContextValue } from '../../../context/alerts_context';
import { getTimeFieldOptions } from '../../../../common/lib/get_time_options';
import { firstFieldOption, getFields, getIndexOptions } from '../../../../common/index_controls';
import { GeoIndexPatternSelect } from './geo_index_pattern_select';
import {
  ForLastExpression,
  GroupByExpression,
  OfExpression,
  ThresholdExpression,
  WhenExpression,
} from '../../../../common/expression_items';
import { builtInAggregationTypes, builtInComparators } from '../../../../common/constants';
import { ThresholdVisualization } from '../threshold/visualization';

const DEFAULT_VALUES = {
  TRACKING_EVENT: TrackingEvent.entered,
  ENTITY: '',
  INDEX: '',
  DATE_FIELD: '',
  SHAPES_ARR: [],
  TYPE: '',
};

export const GeoThresholdAlertTypeExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, alertsContext }) => {
  const { trackingEvent, entity, index, dateField, shapesArr, type } = alertParams;
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const { IndexPatternSelect } = dataUi;

  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [esFields, setEsFields] = useState<Record<string, any>>([]);
  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const hasExpressionErrors = false;
  // !!Object.keys(errors).find(
  //   (errorKey) =>
  //     expressionFieldsWithValidation.includes(errorKey) &&
  //     errors[errorKey].length >= 1 &&
  //     (alertParams as { [key: string]: any })[errorKey] !== undefined
  // );

  const canShowVizualization = true;//!!Object.keys(errors).find(
  //   (errorKey) => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  // );

  const expressionErrorMessage = i18n.translate(
    'xpack.triggersActionsUI.sections.alertAdd.threshold.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const closeIndexPopover = () => {
    setIndexPopoverOpen(false);
    if (timeField === undefined) {
      setAlertParams('dateField', '');
    }
  };


  useEffect(() => {
    const initToDefaultParams = async () => {
      setAlertProperty('params', {
        ...alertParams,
        trackingEvent: trackingEvent ?? DEFAULT_VALUES.TRACKING_EVENT,
        entity: entity ?? DEFAULT_VALUES.ENTITY,
        index: index ?? DEFAULT_VALUES.INDEX,
        dateField: dateField ?? DEFAULT_VALUES.DATE_FIELD,
        shapesArr: shapesArr ?? DEFAULT_VALUES.SHAPES_ARR,
        type: type ?? DEFAULT_VALUES.TYPE,
      });

      if (index && index.length > 0) {
        const currentEsFields = await getFields(http, index);
        const timeFields = getTimeFieldOptions(currentEsFields as any);

        setEsFields(currentEsFields);
        setTimeFieldOptions([firstFieldOption, ...timeFields]);
      }
    };
    initToDefaultParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexPopover = (
    <Fragment>
      <EuiFormRow
        id="geoIndexPatternSelect"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.threshold.indicesToQueryLabel"
            defaultMessage="Indices to query"
          />
        }
        isInvalid={false/*errors.index.length > 0 && index !== undefined*/}
        error={errors.index}
      >
        <GeoIndexPatternSelect
          onChange={() => console.log('index updated')}
          value={''}
          IndexPatternSelectComponent={dataUi.IndexPatternSelect}
          indexPatternService={dataIndexPatterns}
          http={http}
        />
      </EuiFormRow>
      <EuiFormRow
        id="thresholdTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.threshold.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
        isInvalid={false/*errors.timeField.length > 0 && timeField !== undefined*/}
        error={''/*errors.timeField*/}
      >
        <EuiSelect
          options={timeFieldOptions}
          isInvalid={false/*errors.timeField.length > 0 && timeField !== undefined*/}
          fullWidth
          name="thresholdTimeField"
          data-test-subj="thresholdAlertTimeFieldSelect"
          value={dateField}
          onChange={(e) => {
            setAlertParams('dateField', e.target.value);
          }}
          onBlur={() => {
            if (timeField === undefined) {
              setAlertParams('dateField', '');
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
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.selectIndex"
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
            description={i18n.translate(
              'xpack.triggersActionsUI.sections.alertAdd.threshold.indexLabel',
              {
                defaultMessage: 'index',
              }
            )}
            value={index && index.length > 0 ? renderIndices(index) : firstFieldOption.text}
            isActive={indexPopoverOpen}
            onClick={() => {
              setIndexPopoverOpen(true);
            }}
            isInvalid={!(index && index.length > 0 && dateField !== '')}
          />
        }
        isOpen={indexPopoverOpen}
        closePopover={closeIndexPopover}
        ownFocus
        withTitle
        anchorPosition="downLeft"
        zIndex={8000}
        display="block"
      >
        <div style={{ width: '450px' }}>
          <EuiPopoverTitle>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.threshold.indexButtonLabel',
                  {
                    defaultMessage: 'index',
                  }
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="closePopover"
                  iconType="cross"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.alertAdd.threshold.closeIndexPopoverLabel',
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
      {/*<WhenExpression*/}
      {/*  display="fullWidth"*/}
      {/*  aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}*/}
      {/*  onChangeSelectedAggType={(selectedAggType: string) =>*/}
      {/*    setAlertParams('aggType', selectedAggType)*/}
      {/*  }*/}
      {/*/>*/}
      {/*{aggType && builtInAggregationTypes[aggType].fieldRequired ? (*/}
      {/*  <OfExpression*/}
      {/*    aggField={aggField}*/}
      {/*    fields={esFields}*/}
      {/*    aggType={aggType}*/}
      {/*    errors={errors}*/}
      {/*    display="fullWidth"*/}
      {/*    onChangeSelectedAggField={(selectedAggField?: string) =>*/}
      {/*      setAlertParams('aggField', selectedAggField)*/}
      {/*    }*/}
      {/*  />*/}
      {/*) : null}*/}
      {/*<GroupByExpression*/}
      {/*  groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}*/}
      {/*  termField={termField}*/}
      {/*  termSize={termSize}*/}
      {/*  errors={errors}*/}
      {/*  fields={esFields}*/}
      {/*  display="fullWidth"*/}
      {/*  onChangeSelectedGroupBy={(selectedGroupBy) => setAlertParams('groupBy', selectedGroupBy)}*/}
      {/*  onChangeSelectedTermField={(selectedTermField) =>*/}
      {/*    setAlertParams('termField', selectedTermField)*/}
      {/*  }*/}
      {/*  onChangeSelectedTermSize={(selectedTermSize) =>*/}
      {/*    setAlertParams('termSize', selectedTermSize)*/}
      {/*  }*/}
      {/*/>*/}
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertAdd.conditionPrompt"
            defaultMessage="Define the condition"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {/*<ThresholdExpression*/}
      {/*  thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}*/}
      {/*  threshold={threshold}*/}
      {/*  errors={errors}*/}
      {/*  display="fullWidth"*/}
      {/*  popupPosition={'upLeft'}*/}
      {/*  onChangeSelectedThreshold={(selectedThresholds) =>*/}
      {/*    setAlertParams('threshold', selectedThresholds)*/}
      {/*  }*/}
      {/*  onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>*/}
      {/*    setAlertParams('thresholdComparator', selectedThresholdComparator)*/}
      {/*  }*/}
      {/*/>*/}
      {/*<ForLastExpression*/}
      {/*  popupPosition={'upLeft'}*/}
      {/*  timeWindowSize={timeWindowSize}*/}
      {/*  timeWindowUnit={timeWindowUnit}*/}
      {/*  display="fullWidth"*/}
      {/*  errors={errors}*/}
      {/*  onChangeWindowSize={(selectedWindowSize: any) =>*/}
      {/*    setAlertParams('timeWindowSize', selectedWindowSize)*/}
      {/*  }*/}
      {/*  onChangeWindowUnit={(selectedWindowUnit: any) =>*/}
      {/*    setAlertParams('timeWindowUnit', selectedWindowUnit)*/}
      {/*  }*/}
      {/*/>*/}
      <EuiSpacer />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeoThresholdAlertTypeExpression as default };
