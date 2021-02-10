/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import 'brace/theme/github';
import { XJsonMode } from '@kbn/ace';

import {
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiSpacer,
  EuiFormRow,
  EuiCallOut,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { DocLinksStart, HttpSetup } from 'kibana/public';
import { XJson } from '../../../../../../src/plugins/es_ui_shared/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  getFields,
  COMPARATORS,
  ThresholdExpression,
  ForLastExpression,
  ValueExpression,
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
  SIZE: 100,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
};

const expressionFieldsWithValidation = [
  'index',
  'esQuery',
  'size',
  'timeField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

interface KibanaDeps {
  http: HttpSetup;
  docLinks: DocLinksStart;
}

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<EsQueryAlertParams>
> = ({ alertParams, setAlertParams, setAlertProperty, errors, data }) => {
  const {
    index,
    timeField,
    esQuery,
    size,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = alertParams;

  const getDefaultParams = () => ({
    ...alertParams,
    esQuery: esQuery ?? DEFAULT_VALUES.QUERY,
    size: size ?? DEFAULT_VALUES.SIZE,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
  });

  const { http, docLinks } = useKibana<KibanaDeps>().services;

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
  const [testQueryResult, setTestQueryResult] = useState<string | null>(null);
  const [testQueryError, setTestQueryError] = useState<string | null>(null);

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

  const hasValidationErrors = () => {
    const { errors: validationErrors } = validateExpression(currentAlertParams);
    return Object.keys(validationErrors).some(
      (key) => validationErrors[key] && validationErrors[key].length
    );
  };

  const onTestQuery = async () => {
    if (!hasValidationErrors()) {
      setTestQueryError(null);
      setTestQueryResult(null);
      try {
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
              track_total_hits: true,
            }),
          })
          .toPromise();

        const hits = rawResponse.hits;
        setTestQueryResult(
          i18n.translate('xpack.stackAlerts.esQuery.ui.numQueryMatchesText', {
            defaultMessage: 'Query matched {count} documents in the last {window}.',
            values: { count: hits.total, window },
          })
        );
      } catch (err) {
        const message = err?.body?.attributes?.error?.root_cause[0]?.reason || err?.body?.message;
        setTestQueryError(
          i18n.translate('xpack.stackAlerts.esQuery.ui.queryError', {
            defaultMessage: 'Error testing query: {message}',
            values: { message: message ? `${err.message}: ${message}` : err.message },
          })
        );
      }
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
            defaultMessage="Select an index and size"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <IndexSelectPopover
        index={index}
        data-test-subj="indexSelectPopover"
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
              size: DEFAULT_VALUES.SIZE,
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
      <ValueExpression
        description={i18n.translate('xpack.stackAlerts.esQuery.ui.sizeExpression', {
          defaultMessage: 'Size',
        })}
        data-test-subj="sizeValueExpression"
        value={size}
        errors={errors.size}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedValue={(updatedValue) => {
          setParam('size', updatedValue);
        }}
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
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${docLinks.DOC_LINK_VERSION}/query-dsl.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.queryPrompt.help"
              defaultMessage="ES Query DSL documentation"
            />
          </EuiLink>
        }
      >
        <EuiCodeEditor
          mode={xJsonMode}
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="queryJsonEditor"
          aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.queryEditor', {
            defaultMessage: 'ES query editor',
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
          data-test-subj="testQuery"
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'play'}
          disabled={hasValidationErrors()}
          onClick={onTestQuery}
        >
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.testQuery"
            defaultMessage="Test query"
          />
        </EuiButtonEmpty>
      </EuiFormRow>
      {testQueryResult && (
        <EuiFormRow>
          <EuiText data-test-subj="testQuerySuccess" color="subdued" size="s">
            <p>{testQueryResult}</p>
          </EuiText>
        </EuiFormRow>
      )}
      {testQueryError && (
        <EuiFormRow>
          <EuiText data-test-subj="testQueryError" color="danger" size="s">
            <p>{testQueryError}</p>
          </EuiText>
        </EuiFormRow>
      )}
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
        data-test-subj="thresholdExpression"
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
      <ForLastExpression
        data-test-subj="forLastExpression"
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
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EsQueryAlertTypeExpression as default };
