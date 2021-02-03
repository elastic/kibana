/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFormRow,
  EuiFieldText,
  EuiFlexItem,
  EuiCallOut,
  EuiSpacer,
  EuiDescriptionList,
} from '@elastic/eui';
import type { AlertingApiService } from '../application/services/ml_api_service/alerting';
import { MlAnomalyDetectionAlertParams, PreviewResponse } from '../../common/types/alerts';
import { composeValidators } from '../../common';
import { requiredValidator, timeIntervalInputValidator } from '../../common/util/validators';
import { invalidTimeIntervalMessage } from '../application/jobs/new_job/common/job_validator/util';

export interface PreviewAlertConditionProps {
  alertingApiService: AlertingApiService;
  alertParams: MlAnomalyDetectionAlertParams;
}

const AlertInstancePreview: FC<PreviewResponse['results'][number]> = React.memo(
  ({ jobIds, timestampIso8601, score, topInfluencers, topRecords }) => {
    const listItems = [
      {
        title: i18n.translate('xpack.ml.previewAlert.jobsLabel', {
          defaultMessage: 'Job IDs: ',
        }),
        description: jobIds.join(', '),
      },
      {
        title: i18n.translate('xpack.ml.previewAlert.timeLabel', {
          defaultMessage: 'Time',
        }),
        description: timestampIso8601,
      },
      {
        title: i18n.translate('xpack.ml.previewAlert.scoreLabel', {
          defaultMessage: 'Anomaly score',
        }),
        description: score,
      },
      ...(topInfluencers
        ? [
            {
              title: i18n.translate('xpack.ml.previewAlert.topInfluencersLabel', {
                defaultMessage: 'Top influencers:',
              }),
              description: (
                <ul>
                  {topInfluencers.map((i) => (
                    <li key={i.unique_key}>
                      {i.influencer_field_name} = {i.influencer_field_value} [{i.score}]
                    </li>
                  ))}
                </ul>
              ),
            },
          ]
        : []),
      ...(topRecords
        ? [
            {
              title: i18n.translate('xpack.ml.previewAlert.topRecordsLabel', {
                defaultMessage: 'Top records:',
              }),
              description: (
                <ul>
                  {topRecords.map((i) => (
                    <li key={i.unique_key}>
                      {i.function}({i.field_name}) {i.by_field_value} {i.over_field_value}{' '}
                      {i.partition_field_value} [{i.score}]
                    </li>
                  ))}
                </ul>
              ),
            },
          ]
        : []),
    ];

    return <EuiDescriptionList type={'column'} compressed={true} listItems={listItems} />;
  }
);
export const PreviewAlertCondition: FC<PreviewAlertConditionProps> = ({
  alertingApiService,
  alertParams,
}) => {
  const [lookBehindInterval, setLookBehindInterval] = useState<string>();
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | undefined>();

  const validators = useMemo(
    () => composeValidators(requiredValidator(), timeIntervalInputValidator()),
    []
  );

  const errors = useMemo(() => validators(lookBehindInterval), [lookBehindInterval]);

  useEffect(
    function resetPreview() {
      setPreviewResponse(undefined);
    },
    [alertParams]
  );

  const testCondition = useCallback(async () => {
    try {
      const response = await alertingApiService.preview({
        alertParams,
        timeRange: lookBehindInterval!,
      });
      setPreviewResponse(response);
    } catch (e) {
      // TODO handle error
    }
  }, [alertParams, lookBehindInterval]);

  /**
   * Sample of the 5 results from the top hits
   */
  const sampleHits = useMemo(() => {
    if (!previewResponse) return;

    return previewResponse.results.slice(0, 5);
  }, [previewResponse]);

  const isReady =
    (alertParams.jobSelection?.jobIds?.length! > 0 ||
      alertParams.jobSelection?.groupIds?.length! > 0) &&
    !!alertParams.resultType &&
    !!alertParams.severity &&
    errors === null;

  const isInvalid = lookBehindInterval !== undefined && !!errors;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems={'flexEnd'}>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.previewAlert.intervalLabel"
                defaultMessage="Check the alert condition with an interval"
              />
            }
            isInvalid={isInvalid}
            error={invalidTimeIntervalMessage(lookBehindInterval)}
          >
            <EuiFieldText
              placeholder="15d, 6m"
              value={lookBehindInterval}
              onChange={(e) => {
                setLookBehindInterval(e.target.value);
              }}
              isInvalid={isInvalid}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={testCondition} disabled={!isReady}>
            <FormattedMessage id="xpack.ml.previewAlert.testButtonLabel" defaultMessage="Test" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {previewResponse && sampleHits && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            title={
              <FormattedMessage
                id="xpack.ml.previewAlert.previewMessage"
                defaultMessage="There were {alertsCount} anomalies that satisfied the conditions of the alert in the last {interval}"
                values={{
                  alertsCount: previewResponse.count,
                  interval: lookBehindInterval,
                }}
              />
            }
            iconType="alert"
          >
            <ul>
              {sampleHits.map((v) => {
                return (
                  <li key={v.key}>
                    <AlertInstancePreview {...v} />
                  </li>
                );
              })}
            </ul>
          </EuiCallOut>
        </>
      )}
    </>
  );
};
