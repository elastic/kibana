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

import { EuiCodeEditor, EuiSpacer, EuiFormRow, EuiCallOut, EuiTitle } from '@elastic/eui';
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

interface KibanaDeps {
  http: HttpSetup;
}

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<EsQueryAlertParams>
> = ({ alertParams, setAlertParams, setAlertProperty, errors }) => {
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
    if (index) {
      const currentEsFields = await getFields(http, index);
      setEsFields(currentEsFields);
    }
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
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EsQueryAlertTypeExpression as default };
