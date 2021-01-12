/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import 'brace/theme/github';
import { XJsonMode } from '@kbn/ace';

import {
  EuiCodeEditor,
  EuiFlexItem,
  EuiFlexGroup,
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiFormRow,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { XJson } from '../../../../../../src/plugins/es_ui_shared/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  firstFieldOption,
  getFields,
  COMPARATORS,
  builtInComparators,
  ThresholdExpression,
  ForLastExpression,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { EsQueryVisualization } from './visualization';
import { EsQueryAlertParams } from './types';
import './expression.scss';
import { IndexPopover } from '../components/index_popover';

const DEFAULT_VALUES = {
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  QUERY: `{
  "query":{
    "match_all" : {}
  }
}`,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
};

const expressionFieldsWithValidation = [
  'index',
  'timeField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

interface KibanaDeps {
  http: HttpSetup;
}

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<EsQueryAlertParams>
> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, charts, data }) => {
  const {
    index,
    timeField,
    esQuery,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = alertParams;

  const { http } = useKibana<KibanaDeps>().services;

  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [esFields, setEsFields] = useState<
    Array<{
      name: string;
      type: string;
      normalizedType: string;
      searchable: boolean;
      aggregatable: boolean;
    }>
  >([]);
  const { convertToJson, setXJson, xJson } = useXJsonMode(DEFAULT_VALUES.QUERY);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      alertParams[errorKey as keyof EsQueryAlertParams] !== undefined
  );

  const hasVisualizationErrors = !!Object.keys(errors).find(
    (errorKey) => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setAlertProperty('params', {
      ...alertParams,
      esQuery: esQuery ?? DEFAULT_VALUES.QUERY,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    });

    if (index && index.length > 0) {
      await refreshEsFields();
    }
  };

  const refreshEsFields = async () => {
    const currentEsFields = await getFields(http, index);
    setEsFields(currentEsFields);
  };

  const closeIndexPopover = () => {
    setIndexPopoverOpen(false);
    if (timeField === undefined) {
      setAlertParams('timeField', '');
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            id="xpack.stackAlerts.esQuery.ui.selectIndex"
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
            description={i18n.translate('xpack.stackAlerts.esQuery.ui.alertParams.indexLabel', {
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
                {i18n.translate('xpack.stackAlerts.esQuery.ui.alertParams.indexButtonLabel', {
                  defaultMessage: 'index',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="closePopover"
                  iconType="cross"
                  color="danger"
                  aria-label={i18n.translate(
                    'xpack.stackAlerts.esQuery.ui.alertParams.closeIndexPopoverLabel',
                    {
                      defaultMessage: 'Close',
                    }
                  )}
                  onClick={closeIndexPopover}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>
          <IndexPopover
            index={index}
            esFields={esFields}
            timeField={timeField}
            errors={errors}
            onIndexChange={async (indices: string[]) => {
              setAlertParams('index', indices);

              // reset expression fields if indices are deleted
              if (indices.length === 0) {
                setAlertProperty('params', {
                  ...alertParams,
                  index: indices,
                  esQuery: DEFAULT_VALUES.QUERY,
                  thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
                  timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
                  timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
                  threshold: DEFAULT_VALUES.THRESHOLD,
                  timeField: '',
                });
              } else {
                await refreshEsFields();
              }
            }}
            onTimeFieldChange={(updatedTimeField: string) =>
              setAlertParams('timeField', updatedTimeField)
            }
          />
        </div>
      </EuiPopover>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.queryPrompt"
            defaultMessage="Define the ES query"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        id="queryEditor"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.queryPrompt.label"
            defaultMessage="ES query"
          />
        }
        isInvalid={errors.esQuery.length > 0}
        error={errors.esQuery}
        helpText={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.queryPrompt.help"
            defaultMessage="Help meeeeee."
          />
        }
      >
        <EuiCodeEditor
          mode={xJsonMode}
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="queryJsonEditor"
          aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.queryEditor', {
            defaultMessage: 'Es query editor',
          })}
          value={xJson}
          onChange={(xjson: string) => {
            setXJson(xjson);
            setAlertParams('esQuery', convertToJson(xjson));
          }}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.conditionPrompt"
            defaultMessage="When number of matches"
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
      {/* <div className="actAlertVisualization__chart">
        {hasVisualizationErrors ? (
          <Fragment>
            <EuiEmptyPrompt
              iconType="visBarVertical"
              body={
                <EuiText color="subdued">
                  <FormattedMessage
                    id="xpack.stackAlerts.esQuery.ui.previewAlertVisualizationDescription"
                    defaultMessage="Complete the expression to generate a preview."
                  />
                </EuiText>
              }
            />
          </Fragment>
        ) : (
          <Fragment>
            <EsQueryVisualization
              alertParams={alertParams}
              alertInterval={alertInterval}
              comparators={builtInComparators}
              charts={charts}
              dataFieldsFormats={data!.fieldFormats}
            />
          </Fragment>
        )}
      </div> */}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EsQueryAlertTypeExpression as default };
