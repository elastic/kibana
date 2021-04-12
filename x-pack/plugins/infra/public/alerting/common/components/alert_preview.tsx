/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiAccordion,
  EuiCodeBlock,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertNotifyWhenType } from '../../../../../alerting/common';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
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
  alertThrottle: string;
  alertNotifyWhen: AlertNotifyWhenType;
  alertType: PreviewableAlertTypes;
  alertParams: { criteria?: any[]; sourceId: string } & Record<string, any>;
  validate: (params: any) => ValidationResult;
  showNoDataResults?: boolean;
  groupByDisplayName?: string;
}

export const AlertPreview: React.FC<Props> = (props) => {
  const {
    alertParams,
    alertInterval,
    alertThrottle,
    alertNotifyWhen,
    alertType,
    validate,
    showNoDataResults,
    groupByDisplayName,
  } = props;
  const { http } = useKibana().services;

  const [previewLookbackInterval, setPreviewLookbackInterval] = useState<string>('h');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<any | false>(false);
  const [previewResult, setPreviewResult] = useState<
    (AlertPreviewSuccessResponsePayload & Record<string, any>) | null
  >(null);

  const onSelectPreviewLookbackInterval = useCallback((e) => {
    setPreviewLookbackInterval(e.target.value);
  }, []);

  const onClickPreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setPreviewResult(null);
    setPreviewError(false);
    try {
      const result = await getAlertPreview({
        fetch: http!.fetch,
        params: {
          ...alertParams,
          lookback: previewLookbackInterval as 'h' | 'd' | 'w' | 'M',
          alertInterval,
          alertThrottle,
          alertNotifyWhen,
          alertOnNoData: showNoDataResults ?? false,
        } as AlertPreviewRequestParams,
        alertType,
      });
      setPreviewResult({ ...result, groupByDisplayName, previewLookbackInterval, alertThrottle });
    } catch (e) {
      setPreviewError(e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    alertParams,
    alertInterval,
    alertType,
    alertNotifyWhen,
    groupByDisplayName,
    previewLookbackInterval,
    alertThrottle,
    showNoDataResults,
    http,
  ]);

  const previewIntervalError = useMemo(() => {
    const intervalInSeconds = getIntervalInSeconds(alertInterval);
    const lookbackInSeconds = getIntervalInSeconds(`1${previewLookbackInterval}`);
    if (intervalInSeconds >= lookbackInSeconds) {
      return true;
    }
    return false;
  }, [previewLookbackInterval, alertInterval]);

  const isPreviewDisabled = useMemo(() => {
    if (!alertParams.criteria) return false;
    const validationResult = validate({ criteria: alertParams.criteria } as any);
    const hasValidationErrors = Object.values(validationResult.errors).some((result) =>
      Object.values(result).some((arr) => Array.isArray(arr) && arr.length)
    );
    return hasValidationErrors || previewIntervalError;
  }, [alertParams.criteria, previewIntervalError, validate]);

  const showNumberOfNotifications = useMemo(() => {
    if (!previewResult) return false;
    if (alertNotifyWhen === 'onActiveAlert') return false;
    const { notifications, fired, noData, error } = previewResult.resultTotals;
    const unthrottledNotifications = fired + (showNoDataResults ? noData + error : 0);
    return unthrottledNotifications > notifications;
  }, [previewResult, showNoDataResults, alertNotifyWhen]);

  const hasWarningThreshold = useMemo(
    () => alertParams.criteria?.some((c) => Reflect.has(c, 'warningThreshold')) ?? false,
    [alertParams]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.infra.metrics.alertFlyout.previewLabel', {
        defaultMessage: 'Preview',
      })}
      fullWidth
      display="rowCompressed"
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
              size="s"
              title={
                <PreviewTextString
                  previewResult={previewResult}
                  hasWarningThreshold={Boolean(hasWarningThreshold)}
                />
              }
            >
              {showNoDataResults && previewResult.resultTotals.noData ? (
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewNoDataResult"
                  defaultMessage="There {wereWas} {boldedResultsNumber} of no data."
                  values={{
                    wereWas: (
                      <FormattedMessage
                        id="xpack.infra.metrics.alertFlyout.wereWas"
                        defaultMessage="{plurality, plural, one {was} other {were}}"
                        values={{
                          plurality: previewResult.resultTotals.noData,
                        }}
                      />
                    ),
                    boldedResultsNumber: (
                      <strong>
                        {i18n.translate(
                          'xpack.infra.metrics.alertFlyout.alertPreviewNoDataResultNumber',
                          {
                            defaultMessage: '{noData, plural, one {# result} other {# results}}',
                            values: {
                              noData: previewResult.resultTotals.noData,
                            },
                          }
                        )}
                      </strong>
                    ),
                  }}
                />
              ) : null}{' '}
              {previewResult.resultTotals.error ? (
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewErrorResult"
                  defaultMessage="An error occurred when trying to evaluate some of the data."
                />
              ) : null}
              {showNumberOfNotifications ? (
                <>
                  <EuiSpacer size={'s'} />
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewTotalNotifications"
                    defaultMessage='As a result, this alert would have sent {notifications} based on the selected "notify" setting of "{alertThrottle}."'
                    values={{
                      alertThrottle:
                        alertNotifyWhen === 'onThrottleInterval'
                          ? previewResult.alertThrottle
                          : i18n.translate(
                              'xpack.infra.metrics.alertFlyout.alertPreviewOnlyOnStatusChange',
                              {
                                defaultMessage: 'Only on status change',
                              }
                            ),
                      notifications: (
                        <strong>
                          {i18n.translate(
                            'xpack.infra.metrics.alertFlyout.alertPreviewTotalNotificationsNumber',
                            {
                              defaultMessage:
                                '{notifs, plural, one {# notification} other {# notifications}}',
                              values: {
                                notifs: previewResult.resultTotals.notifications,
                              },
                            }
                          )}
                        </strong>
                      ),
                    }}
                  />
                </>
              ) : null}{' '}
            </EuiCallOut>
          </>
        )}
        {previewIntervalError && (
          <>
            <EuiSpacer size={'s'} />
            <EuiCallOut
              size="s"
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
                size="s"
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
                size="s"
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
                  <>
                    <FormattedMessage
                      id="xpack.infra.metrics.alertFlyout.alertPreviewErrorDesc"
                      defaultMessage="Please try again later or see details for more information."
                    />
                    <EuiSpacer size={'s'} />
                    <EuiAccordion
                      id="alertErrorDetailsAccordion"
                      buttonContent={
                        <>
                          <EuiText size="s">
                            <FormattedMessage
                              id="xpack.infra.metrics.alertFlyout.errorDetails"
                              defaultMessage="Details"
                            />
                          </EuiText>
                        </>
                      }
                    >
                      <EuiSpacer size={'s'} />
                      <EuiCodeBlock>{previewError.body.message}</EuiCodeBlock>
                    </EuiAccordion>
                  </>
                )}
              </EuiCallOut>
            )}
          </>
        )}
      </>
    </EuiFormRow>
  );
};

const PreviewTextString = ({
  previewResult,
  hasWarningThreshold,
}: {
  previewResult: AlertPreviewSuccessResponsePayload & Record<string, any>;
  hasWarningThreshold: boolean;
}) => {
  const instanceCount = hasWarningThreshold ? (
    <FormattedMessage
      id="xpack.infra.metrics.alertFlyout.alertPreviewResultWithSeverityLevels"
      defaultMessage="There {wereWas} {criticalInstances} that satisfied the {boldCritical} conditions, and {warningInstances} that satisfied the {boldWarning} conditions of this alert"
      values={{
        wereWas: (
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.wereWas"
            defaultMessage="{plurality, plural, one {was} other {were}}"
            values={{
              plurality: previewResult.resultTotals.fired,
            }}
          />
        ),
        criticalInstances: (
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.alertFlyout.firedTimes"
              defaultMessage="{fired, plural, one {# instance} other {# instances}}"
              values={{
                fired: previewResult.resultTotals.fired,
              }}
            />
          </strong>
        ),
        warningInstances: (
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.alertFlyout.firedTimes"
              defaultMessage="{fired, plural, one {# instance} other {# instances}}"
              values={{
                fired: previewResult.resultTotals.warning,
              }}
            />
          </strong>
        ),
        boldCritical: (
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.alertFlyout.boldCritical"
              defaultMessage="critical"
            />
          </strong>
        ),
        boldWarning: (
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.alertFlyout.boldWarning"
              defaultMessage="warning"
            />
          </strong>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.infra.metrics.alertFlyout.alertPreviewResultInstances"
      defaultMessage="There {wereWas} {firedTimes} that satisfied the conditions of this alert"
      values={{
        wereWas: (
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.wereWas"
            defaultMessage="{plurality, plural, one {was} other {were}}"
            values={{
              plurality: previewResult.resultTotals.fired,
            }}
          />
        ),
        firedTimes: (
          <strong>
            <FormattedMessage
              id="xpack.infra.metrics.alertFlyout.firedTimes"
              defaultMessage="{fired, plural, one {# instance} other {# instances}}"
              values={{
                fired: previewResult.resultTotals.fired,
              }}
            />
          </strong>
        ),
      }}
    />
  );

  const groupByText = previewResult.groupByDisplayName ? (
    <>
      <FormattedMessage
        id="xpack.infra.metrics.alertFlyout.alertPreviewGroupBy"
        defaultMessage="across {groups}"
        values={{
          groups: (
            <strong>
              <FormattedMessage
                id="xpack.infra.metrics.alertFlyout.alertPreviewGroups"
                defaultMessage="{numberOfGroups, plural, one {# {groupName}} other {# {groupName}s}}"
                values={{
                  numberOfGroups: previewResult.numberOfGroups,
                  groupName: previewResult.groupByDisplayName,
                }}
              />
            </strong>
          ),
        }}
      />{' '}
    </>
  ) : (
    <></>
  );

  const lookbackText = (
    <FormattedMessage
      id="xpack.infra.metrics.alertFlyout.alertPreviewLookback"
      defaultMessage="in the last {lookback}"
      values={{
        lookback: previewOptions.find((e) => e.value === previewResult.previewLookbackInterval)
          ?.shortText,
      }}
    />
  );

  return (
    <FormattedMessage
      id="xpack.infra.metrics.alertFlyout.alertPreviewResultText"
      defaultMessage="{instanceCount} {groupByWithConditionalTrailingSpace}{lookbackText}."
      values={{
        instanceCount,
        groupByWithConditionalTrailingSpace: groupByText,
        lookbackText,
      }}
    />
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
