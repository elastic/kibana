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
import { isEmpty } from 'lodash';

import {
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSpacer,
  EuiFormRow,
  EuiCallOut,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { XJson } from '../../../../../../src/plugins/es_ui_shared/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  getFields,
  COMPARATORS,
  ThresholdExpression,
  ForLastExpression,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { validateExpression } from './validation';
import { parseDuration } from '../../../../alerts/common';
import { buildSortedEventsQuery } from '../../../common/build_sorted_events_query';
import { EsQueryAlertParams } from './types';
import { IndexSelectPopover } from '../components/index_select_popover';

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
  'esQuery',
  'timeField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

interface KibanaDeps {
  http: HttpSetup;
}

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<EsQueryAlertParams>
> = ({ alertParams, setAlertParams, setAlertProperty, errors, data }) => {
  const {
    index,
    timeField,
    esQuery,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = alertParams;

  const getDefaultParams = () => ({
    ...alertParams,
    esQuery: esQuery ?? DEFAULT_VALUES.QUERY,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
  });

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
  const { convertToJson, setXJson, xJson } = useXJsonMode(DEFAULT_VALUES.QUERY);
  const [currentAlertParams, setCurrentAlertParams] = useState<EsQueryAlertParams>(
    getDefaultParams()
  );
  const [hasThresholdExpression, setHasThresholdExpression] = useState(true);
  const [runResult, setRunResult] = useState<string | null>(null);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      alertParams[errorKey as keyof EsQueryAlertParams] !== undefined
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setAlertProperty('params', getDefaultParams());

    setXJson(esQuery ?? DEFAULT_VALUES.QUERY);
    if (!isEmpty(alertParams)) {
      setHasThresholdExpression(!!threshold && !!thresholdComparator);
    }

    if (index && index.length > 0) {
      await refreshEsFields();
    }
  };

  const setParam = (paramField: string, paramValue: unknown) => {
    setCurrentAlertParams({
      ...currentAlertParams,
      [paramField]: paramValue,
    });
    setAlertParams(paramField, paramValue);
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshEsFields = async () => {
    if (index) {
      const currentEsFields = await getFields(http, index);
      setEsFields(currentEsFields);
    }
  };

  const onRunQuery = async () => {
    const { errors: validationErrors } = validateExpression(currentAlertParams);
    if (
      Object.keys(validationErrors).every(
        (key) => !validationErrors[key] || !validationErrors[key].length
      )
    ) {
      const window = `${timeWindowSize}${timeWindowUnit}`;
      const timeWindow = parseDuration(window);
      const parsedQuery = JSON.parse(esQuery);
      const now = Date.now();
      const { rawResponse } = await data.search
        .search({
          params: buildSortedEventsQuery({
            index,
            from: new Date(now - timeWindow).toISOString(),
            to: new Date(now).toISOString(),
            filter: parsedQuery.query,
            size: 0,
            searchAfterSortId: undefined,
            timeField: timeField ? timeField : '',
          }),
        })
        .toPromise();

      const hits = rawResponse.hits;
      setRunResult(
        i18n.translate(
          'xpack.triggersActionsUI.components.deleteSelectedIdsSuccessNotification.descriptionText',
          {
            defaultMessage: 'Query matched {count} documents in the last {window}',
            values: { count: hits.total, window },
          }
        )
      );
    }
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
      <IndexSelectPopover
        index={index}
        esFields={esFields}
        timeField={timeField}
        errors={errors}
        onIndexChange={async (indices: string[]) => {
          setParam('index', indices);

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
        onTimeFieldChange={(updatedTimeField: string) => setParam('timeField', updatedTimeField)}
      />
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
            setParam('esQuery', convertToJson(xjson));
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiButtonEmpty
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'play'}
          onClick={onRunQuery}
        >
          <FormattedMessage id="xpack.stackAlerts.esQuery.ui.runQuery" defaultMessage="Run query" />
        </EuiButtonEmpty>
      </EuiFormRow>
      {runResult && (
        <EuiFormRow>
          <EuiText color="subdued" size="s">
            <p>{runResult}</p>
          </EuiText>
        </EuiFormRow>
      )}

      <EuiSpacer />
      <ForLastExpression
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setParam('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setParam('timeWindowUnit', selectedWindowUnit)
        }
      />
      <EuiSpacer />
      {hasThresholdExpression ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h5>
                  <FormattedMessage
                    id="xpack.stackAlerts.esQuery.ui.conditionPrompt"
                    defaultMessage="When number of matches"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.infra.logs.alertFlyout.removeCondition', {
                  defaultMessage: 'Remove condition',
                })}
                color={'danger'}
                iconType={'trash'}
                onClick={() => {
                  setParam('threshold', undefined);
                  setParam('thresholdComparator', undefined);
                  setHasThresholdExpression(false);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText color="subdued" size="s">
            <p>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.conditionDescription"
                defaultMessage="Get a single alert when the number of matches meets the defined conditions. Remove
                    this condition to receive an alert for every document that matches the query."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <ThresholdExpression
            thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
            threshold={threshold ?? DEFAULT_VALUES.THRESHOLD}
            errors={errors}
            display="fullWidth"
            popupPosition={'upLeft'}
            onChangeSelectedThreshold={(selectedThresholds) =>
              setParam('threshold', selectedThresholds)
            }
            onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
              setParam('thresholdComparator', selectedThresholdComparator)
            }
          />
          <EuiSpacer />
        </>
      ) : (
        <>
          <EuiButtonEmpty
            color={'primary'}
            iconSide={'left'}
            flush={'left'}
            iconType={'plusInCircleFilled'}
            onClick={() => {
              setParam('threshold', DEFAULT_VALUES.THRESHOLD);
              setParam('thresholdComparator', DEFAULT_VALUES.THRESHOLD_COMPARATOR);
              setHasThresholdExpression(true);
            }}
          >
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.addConditionButton"
              defaultMessage="Add condition"
            />
          </EuiButtonEmpty>
          <EuiText color="subdued" size="s">
            <p>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.addConditionDescription"
                defaultMessage="By adding a condition, you will get a single alert when the number of query matches meets the condition. Otherwise, you will get an alert for every document that matches your query."
              />
            </p>
          </EuiText>
          <EuiSpacer />
        </>
      )}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EsQueryAlertTypeExpression as default };
