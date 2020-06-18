/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import { FETCH_STATUS, useFetcher } from '../../../../../hooks/useFetcher';
import { getHasMLJob } from '../../../../../services/rest/ml';
import { MLJobLink } from '../../../../shared/Links/MachineLearningLinks/MLJobLink';
import { MLLink } from '../../../../shared/Links/MachineLearningLinks/MLLink';
import { TransactionSelect } from './TransactionSelect';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';
import { useServiceTransactionTypes } from '../../../../../hooks/useServiceTransactionTypes';
import { useApmPluginContext } from '../../../../../hooks/useApmPluginContext';

interface Props {
  isCreatingJob: boolean;
  onClickCreate: ({ transactionType }: { transactionType: string }) => void;
  onClose: () => void;
  urlParams: IUrlParams;
}

export function MachineLearningFlyoutView({
  isCreatingJob,
  onClickCreate,
  onClose,
  urlParams,
}: Props) {
  const { serviceName } = urlParams;
  const transactionTypes = useServiceTransactionTypes(urlParams);

  const [selectedTransactionType, setSelectedTransactionType] = useState<
    string | undefined
  >(undefined);

  const { http } = useApmPluginContext().core;

  const { data: hasMLJob, status } = useFetcher(
    () => {
      if (serviceName && selectedTransactionType) {
        return getHasMLJob({
          serviceName,
          transactionType: selectedTransactionType,
          http,
        });
      }
    },
    [serviceName, selectedTransactionType, http],
    { showToastOnError: false }
  );

  // update selectedTransactionType when list of transaction types has loaded
  useEffect(() => {
    setSelectedTransactionType(transactionTypes[0]);
  }, [transactionTypes]);

  if (!serviceName || !selectedTransactionType || isEmpty(transactionTypes)) {
    return null;
  }

  const isLoadingMLJob = status === FETCH_STATUS.LOADING;
  const isMlAvailable = status !== FETCH_STATUS.FAILURE;

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.enableAnomalyDetectionTitle',
              {
                defaultMessage: 'Enable anomaly detection',
              }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!isMlAvailable && (
          <div>
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.mlNotAvailable',
                {
                  defaultMessage: 'Machine learning not available',
                }
              )}
              color="warning"
              iconType="alert"
            >
              <p>
                {i18n.translate(
                  'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.mlNotAvailableDescription',
                  {
                    defaultMessage:
                      'Unable to connect to Machine learning. Make sure it is enabled in Kibana to use anomaly detection.',
                  }
                )}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}
        {hasMLJob && (
          <div>
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.jobExistsTitle',
                {
                  defaultMessage: 'Job already exists',
                }
              )}
              color="success"
              iconType="check"
            >
              <p>
                {i18n.translate(
                  'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.jobExistsDescription',
                  {
                    defaultMessage:
                      'There is currently a job running for {serviceName} ({transactionType}).',
                    values: {
                      serviceName,
                      transactionType: selectedTransactionType,
                    },
                  }
                )}{' '}
                <MLJobLink
                  serviceName={serviceName}
                  transactionType={selectedTransactionType}
                >
                  {i18n.translate(
                    'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.jobExistsDescription.viewJobLinkText',
                    {
                      defaultMessage: 'View existing job',
                    }
                  )}
                </MLJobLink>
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createMLJobDescription"
              defaultMessage="Create a machine learning job to calculate anomaly scores on APM transaction durations
                    within the {serviceName} service. When enabled, anomalies are show in two places:
                    The {transactionDurationGraphText} graph will show the expected bounds and annotate
                    the graph if the anomaly score is &gt;=75, and {serviceMapAnnotationText} will display color
                    coded service indicators based on the active anomaly score."
              values={{
                serviceName,
                transactionDurationGraphText: (
                  <b>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createMLJobDescription.transactionDurationGraphText',
                      {
                        defaultMessage: 'transaction duration',
                      }
                    )}
                  </b>
                ),
                serviceMapAnnotationText: (
                  <b>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createMLJobDescription.serviceMapAnnotationText',
                      {
                        defaultMessage: 'service maps',
                      }
                    )}
                  </b>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription"
              defaultMessage="Jobs can be created for each service and transaction type.
                    Once a job is created, you can manage it and see more details on the {mlJobsPageLink}."
              values={{
                mlJobsPageLink: (
                  <MLLink>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription.mlJobsPageLinkText',
                      {
                        defaultMessage: 'Machine Learning Job Management page',
                      }
                    )}
                  </MLLink>
                ),
              }}
            />{' '}
            <em>
              {i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription.noteText',
                {
                  defaultMessage:
                    'Note: It might take a few minutes for the job to begin calculating results.',
                }
              )}
            </em>
          </p>
        </EuiText>

        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem>
            {transactionTypes.length > 1 ? (
              <TransactionSelect
                selectedTransactionType={selectedTransactionType}
                transactionTypes={transactionTypes}
                onChange={(value: string) => {
                  setSelectedTransactionType(value);
                }}
              />
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton
                onClick={() =>
                  onClickCreate({ transactionType: selectedTransactionType })
                }
                fill
                disabled={isCreatingJob || hasMLJob || isLoadingMLJob}
              >
                {i18n.translate(
                  'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createNewJobButtonLabel',
                  {
                    defaultMessage: 'Create job',
                  }
                )}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
