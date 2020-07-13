/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { omit } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSpacer,
  EuiFormRow,
  EuiButton,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FORMATTERS } from '../../../../common/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../triggers_actions_ui/public/types';
import {
  AlertPreviewSuccessResponsePayload,
  AlertPreviewRequestParams,
} from '../../../../common/alerting/metrics';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getIntervalInSeconds } from '../../../../server/utils/get_interval_in_seconds';
import { getAlertPreview, PreviewableAlertTypes } from './get_alert_preview';

interface Props {
  alertInterval: string;
  alertType: PreviewableAlertTypes;
  fetch: HttpSetup['fetch'];
  alertParams: { criteria: any[]; sourceId: string } & Record<string, any>;
  validate: (params: any) => ValidationResult;
  showNoDataResults?: boolean;
  groupByDisplayName?: string;
}

export const AlertPreview: React.FC<Props> = (props) => {
  const {
    alertParams,
    alertInterval,
    fetch,
    alertType,
    validate,
    showNoDataResults,
    groupByDisplayName,
  } = props;
  const [previewLookbackInterval, setPreviewLookbackInterval] = useState<string>('h');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<any | false>(false);
  const [previewResult, setPreviewResult] = useState<
    (AlertPreviewSuccessResponsePayload & Record<string, any>) | null
  >(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState<boolean>(false);
  const onOpenModal = useCallback(() => setIsErrorModalVisible(true), [setIsErrorModalVisible]);
  const onCloseModal = useCallback(() => setIsErrorModalVisible(false), [setIsErrorModalVisible]);

  const onSelectPreviewLookbackInterval = useCallback((e) => {
    setPreviewLookbackInterval(e.target.value);
  }, []);

  const onClickPreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setPreviewResult(null);
    setPreviewError(false);
    try {
      const result = await getAlertPreview({
        fetch,
        params: {
          ...alertParams,
          lookback: previewLookbackInterval as 'h' | 'd' | 'w' | 'M',
          alertInterval,
        } as AlertPreviewRequestParams,
        alertType,
      });
      setPreviewResult({ ...result, groupByDisplayName, previewLookbackInterval });
    } catch (e) {
      setPreviewError(e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [alertParams, alertInterval, fetch, alertType, groupByDisplayName, previewLookbackInterval]);

  const previewIntervalError = useMemo(() => {
    const intervalInSeconds = getIntervalInSeconds(alertInterval);
    const lookbackInSeconds = getIntervalInSeconds(`1${previewLookbackInterval}`);
    if (intervalInSeconds >= lookbackInSeconds) {
      return true;
    }
    return false;
  }, [previewLookbackInterval, alertInterval]);

  const isPreviewDisabled = useMemo(() => {
    const validationResult = validate({ criteria: alertParams.criteria } as any);
    const hasValidationErrors = Object.values(validationResult.errors).some((result) =>
      Object.values(result).some((arr) => Array.isArray(arr) && arr.length)
    );
    return hasValidationErrors || previewIntervalError;
  }, [alertParams.criteria, previewIntervalError, validate]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.infra.metrics.alertFlyout.previewLabel', {
        defaultMessage: 'Preview',
      })}
      fullWidth
      compressed
    >
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiSelect
              id="selectPreviewLookbackInterval"
              value={previewLookbackInterval}
              onChange={onSelectPreviewLookbackInterval}
              options={previewDOMOptions}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isPreviewLoading}
              isDisabled={isPreviewDisabled}
              onClick={onClickPreview}
            >
              {i18n.translate('xpack.infra.metrics.alertFlyout.testAlertCondition', {
                defaultMessage: 'Test alert condition',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiSpacer size={'s'} />
        </EuiFlexGroup>
        {previewResult && !previewIntervalError && (
          <>
            <EuiSpacer size={'s'} />
            <EuiCallOut
              iconType="iInCircle"
              title={
                <>
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewResult"
                    defaultMessage="This alert would have occurred {firedTimes}"
                    values={{
                      firedTimes: (
                        <strong>
                          {previewResult.resultTotals.fired}{' '}
                          {previewResult.resultTotals.fired === 1
                            ? firedTimeLabel
                            : firedTimesLabel}
                        </strong>
                      ),
                    }}
                  />{' '}
                  {previewResult.groupByDisplayName ? (
                    <>
                      <FormattedMessage
                        id="xpack.infra.metrics.alertFlyout.alertPreviewGroupsAcross"
                        defaultMessage="across"
                      />{' '}
                      <strong>
                        <FormattedMessage
                          id="xpack.infra.metrics.alertFlyout.alertPreviewGroups"
                          defaultMessage="{numberOfGroups} {groupName}{plural}"
                          values={{
                            numberOfGroups: previewResult.numberOfGroups,
                            groupName: previewResult.groupByDisplayName,
                            plural: previewResult.numberOfGroups !== 1 ? 's' : '',
                          }}
                        />
                      </strong>{' '}
                    </>
                  ) : null}
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewResultLookback"
                    defaultMessage="in the last {lookback}."
                    values={{
                      lookback: previewOptions.find(
                        (e) => e.value === previewResult.previewLookbackInterval
                      )?.shortText,
                    }}
                  />
                </>
              }
            >
              {showNoDataResults && previewResult.resultTotals.noData ? (
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewNoDataResult"
                  defaultMessage="There {were} {noData} result{plural} of no data."
                  values={{
                    were: previewResult.resultTotals.noData !== 1 ? 'were' : 'was',
                    noData: <strong>{previewResult.resultTotals.noData}</strong>,
                    plural: previewResult.resultTotals.noData !== 1 ? 's' : '',
                  }}
                />
              ) : null}
              {previewResult.resultTotals.error ? (
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewErrorResult"
                  defaultMessage="An error occurred when trying to evaluate some of the data."
                />
              ) : null}
            </EuiCallOut>
          </>
        )}
        {previewIntervalError && (
          <>
            <EuiSpacer size={'s'} />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.previewIntervalTooShortTitle"
                  defaultMessage="Not enough data"
                />
              }
              color="warning"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.infra.metrics.alertFlyout.previewIntervalTooShortDescription"
                defaultMessage="Try selecting a longer preview length, or increase the amount of time in the {checkEvery} field."
                values={{
                  checkEvery: <strong>check every</strong>,
                }}
              />
            </EuiCallOut>
          </>
        )}
        {previewError && (
          <>
            <EuiSpacer size={'s'} />
            {previewError.body?.statusCode === 508 ? (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.tooManyBucketsErrorTitle"
                    defaultMessage="Too much data (>{maxBuckets} results)"
                    values={{
                      maxBuckets: FORMATTERS.number(previewError.body.message),
                    }}
                  />
                }
                color="warning"
                iconType="help"
              >
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.tooManyBucketsErrorDescription"
                  defaultMessage="Try selecting a shorter preview length, or increase the amount of time in the {forTheLast} field."
                  values={{
                    forTheLast: <strong>FOR THE LAST</strong>,
                  }}
                />
              </EuiCallOut>
            ) : (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewError"
                    defaultMessage="An error occurred when trying to preview this alert condition"
                  />
                }
                color="danger"
                iconType="alert"
              >
                {previewError.body && (
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewErrorDesc"
                    defaultMessage="Try again later, or {viewTheError}."
                    values={{
                      viewTheError: <EuiLink onClick={onOpenModal}>view the error</EuiLink>,
                    }}
                  />
                )}
              </EuiCallOut>
            )}
            {isErrorModalVisible && (
              <EuiOverlayMask>
                <EuiModal onClose={onCloseModal}>
                  <EuiModalHeader>
                    <EuiModalHeaderTitle>
                      <FormattedMessage
                        id="xpack.infra.metrics.alertFlyout.alertPreviewErrorModalTitle"
                        defaultMessage="Alert preview error"
                      />
                    </EuiModalHeaderTitle>
                  </EuiModalHeader>
                  <EuiModalBody>
                    <EuiCodeBlock>{previewError.body.message}</EuiCodeBlock>
                  </EuiModalBody>
                </EuiModal>
              </EuiOverlayMask>
            )}
          </>
        )}
      </>
    </EuiFormRow>
  );
};

const previewOptions = [
  {
    value: 'h',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastHourLabel', {
      defaultMessage: 'Last hour',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.hourLabel', {
      defaultMessage: 'hour',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastDayLabel', {
      defaultMessage: 'Last day',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.dayLabel', {
      defaultMessage: 'day',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastWeekLabel', {
      defaultMessage: 'Last week',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.weekLabel', {
      defaultMessage: 'week',
    }),
  },
  {
    value: 'M',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastMonthLabel', {
      defaultMessage: 'Last month',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.monthLabel', {
      defaultMessage: 'month',
    }),
  },
];

const previewDOMOptions: Array<{ text: string; value: string }> = previewOptions.map((o) =>
  omit(o, 'shortText')
);

const firedTimeLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTime', {
  defaultMessage: 'time',
});
const firedTimesLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTimes', {
  defaultMessage: 'times',
});
