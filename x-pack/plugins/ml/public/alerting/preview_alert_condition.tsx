/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { AlertingApiService } from '../application/services/ml_api_service/alerting';
import { MlAnomalyDetectionAlertParams, PreviewResponse } from '../../common/types/alerts';
import { composeValidators } from '../../common';
import { requiredValidator, timeIntervalInputValidator } from '../../common/util/validators';
import { invalidTimeIntervalMessage } from '../application/jobs/new_job/common/job_validator/util';
import { ALERT_PREVIEW_SAMPLE_SIZE } from '../../common/constants/alerts';

export interface PreviewAlertConditionProps {
  alertingApiService: AlertingApiService;
  alertParams: MlAnomalyDetectionAlertParams;
}

const AlertInstancePreview: FC<PreviewResponse['results'][number]> = React.memo(
  ({ jobIds, timestampIso8601, score, topInfluencers, topRecords }) => {
    const listItems = [
      {
        title: i18n.translate('xpack.ml.previewAlert.jobsLabel', {
          defaultMessage: 'Job IDs:',
        }),
        description: jobIds.join(', '),
      },
      {
        title: i18n.translate('xpack.ml.previewAlert.timeLabel', {
          defaultMessage: 'Time: ',
        }),
        description: timestampIso8601,
      },
      {
        title: i18n.translate('xpack.ml.previewAlert.scoreLabel', {
          defaultMessage: 'Anomaly score:',
        }),
        description: score,
      },
      ...(topInfluencers && topInfluencers.length > 0
        ? [
            {
              title: i18n.translate('xpack.ml.previewAlert.topInfluencersLabel', {
                defaultMessage: 'Top influencers:',
              }),
              description: (
                <ul>
                  {topInfluencers.map((i) => (
                    <li key={i.unique_key}>
                      <EuiCode transparentBackground>{i.influencer_field_name}</EuiCode> ={' '}
                      {i.influencer_field_value} [{i.score}]
                    </li>
                  ))}
                </ul>
              ),
            },
          ]
        : []),
      ...(topRecords && topRecords.length > 0
        ? [
            {
              title: i18n.translate('xpack.ml.previewAlert.topRecordsLabel', {
                defaultMessage: 'Top records:',
              }),
              description: (
                <ul>
                  {topRecords.map((i) => (
                    <li key={i.unique_key}>
                      <EuiCode transparentBackground>
                        {i.function}({i.field_name})
                      </EuiCode>{' '}
                      {i.by_field_value} {i.over_field_value} {i.partition_field_value} [{i.score}];
                      (
                      <FormattedMessage
                        id="xpack.ml.previewAlert.typicalLabel"
                        defaultMessage="Typical:"
                      />{' '}
                      {i.typical ?? '-'},{' '}
                      <FormattedMessage
                        id="xpack.ml.previewAlert.actualLabel"
                        defaultMessage="Actual:"
                      />{' '}
                      {i.actual ?? '-'})
                    </li>
                  ))}
                </ul>
              ),
            },
          ]
        : []),
    ];

    return <EuiDescriptionList type={'row'} compressed={true} listItems={listItems} />;
  }
);

export const PreviewAlertCondition: FC<PreviewAlertConditionProps> = ({
  alertingApiService,
  alertParams,
}) => {
  const sampleSize = ALERT_PREVIEW_SAMPLE_SIZE;

  const [lookBehindInterval, setLookBehindInterval] = useState<string>();
  const [lastQueryInterval, setLastQueryInterval] = useState<string>();
  const [areResultsVisible, setAreResultVisible] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState<Error | undefined>();
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | undefined>();

  const validators = useMemo(
    () => composeValidators(requiredValidator(), timeIntervalInputValidator()),
    []
  );

  const validationErrors = useMemo(() => validators(lookBehindInterval), [lookBehindInterval]);

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
        sampleSize,
      });
      setPreviewResponse(response);
      setLastQueryInterval(lookBehindInterval);
      setPreviewError(undefined);
    } catch (e) {
      setPreviewResponse(undefined);
      setPreviewError(e.body ?? e);
    }
  }, [alertParams, lookBehindInterval]);

  const sampleHits = useMemo(() => {
    if (!previewResponse) return;

    return previewResponse.results;
  }, [previewResponse]);

  const isReady =
    (alertParams.jobSelection?.jobIds?.length! > 0 ||
      alertParams.jobSelection?.groupIds?.length! > 0) &&
    !!alertParams.resultType &&
    alertParams.severity !== undefined &&
    validationErrors === null;

  const isInvalid = lookBehindInterval !== undefined && !!validationErrors;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems={'flexEnd'}>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.previewAlert.intervalLabel"
                defaultMessage="Check the rule condition with an interval"
              />
            }
            isInvalid={isInvalid}
            error={invalidTimeIntervalMessage(lookBehindInterval)}
          >
            <EuiFieldText
              placeholder="15d, 6m"
              value={lookBehindInterval ?? ''}
              onChange={(e) => {
                setLookBehindInterval(e.target.value);
              }}
              isInvalid={isInvalid}
              data-test-subj={'mlAnomalyAlertPreviewInterval'}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={testCondition}
            disabled={!isReady}
            data-test-subj={'mlAnomalyAlertPreviewButton'}
          >
            <FormattedMessage id="xpack.ml.previewAlert.testButtonLabel" defaultMessage="Test" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {previewError !== undefined && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.previewAlert.previewErrorTitle"
                defaultMessage="Unable to load the preview"
              />
            }
            color="danger"
            iconType="alert"
          >
            <p>{previewError.message}</p>
          </EuiCallOut>
        </>
      )}

      {previewResponse && sampleHits && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
            <EuiFlexItem grow={false}>
              <EuiText size={'xs'} data-test-subj={'mlAnomalyAlertPreviewMessage'}>
                <strong>
                  <FormattedMessage
                    id="xpack.ml.previewAlert.previewMessage"
                    defaultMessage="Found {alertsCount, plural, one {# anomaly} other {# anomalies}} in the last {interval}."
                    values={{
                      alertsCount: previewResponse.count,
                      interval: lastQueryInterval,
                    }}
                  />
                </strong>
              </EuiText>
            </EuiFlexItem>
            {sampleHits.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color={'primary'}
                  size="xs"
                  onClick={setAreResultVisible.bind(null, !areResultsVisible)}
                >
                  {areResultsVisible ? (
                    <FormattedMessage
                      id="xpack.ml.previewAlert.hideResultsButtonLabel"
                      defaultMessage="Hide results"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.ml.previewAlert.showResultsButtonLabel"
                      defaultMessage="Show results"
                    />
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          {areResultsVisible && sampleHits.length > 0 ? (
            <EuiPanel
              color="subdued"
              borderRadius="none"
              hasShadow={false}
              data-test-subj={'mlAnomalyAlertPreviewCallout'}
            >
              <ul>
                {sampleHits.map((v, i) => {
                  return (
                    <li key={v.key}>
                      <AlertInstancePreview {...v} />
                      {i !== sampleHits.length - 1 ? <EuiHorizontalRule margin="xs" /> : null}
                    </li>
                  );
                })}
              </ul>
              {previewResponse.count > sampleSize ? (
                <>
                  <EuiSpacer size={'m'} />
                  <EuiText size={'xs'}>
                    <b>
                      <FormattedMessage
                        id="xpack.ml.previewAlert.otherValuesLabel"
                        defaultMessage="and {count, plural, one {# other} other {# others}}"
                        values={{
                          count: previewResponse.count - sampleSize,
                        }}
                      />
                    </b>
                  </EuiText>
                </>
              ) : null}
            </EuiPanel>
          ) : null}
        </>
      )}
    </>
  );
};
