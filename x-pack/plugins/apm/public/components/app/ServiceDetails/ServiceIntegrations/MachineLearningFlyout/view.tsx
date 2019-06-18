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
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../../../hooks/useFetcher';
import { getHasMLJob } from '../../../../../services/rest/ml';
import { KibanaLink } from '../../../../shared/Links/KibanaLink';
import { MLJobLink } from '../../../../shared/Links/MachineLearningLinks/MLJobLink';
import { MLLink } from '../../../../shared/Links/MachineLearningLinks/MLLink';
import { TransactionSelect } from './TransactionSelect';

interface Props {
  hasIndexPattern: boolean;
  isCreatingJob: boolean;
  onClickCreate: ({ transactionType }: { transactionType: string }) => void;
  onClose: () => void;
  serviceName: string;
  serviceTransactionTypes: string[];
}

export function MachineLearningFlyoutView({
  hasIndexPattern,
  isCreatingJob,
  onClickCreate,
  onClose,
  serviceName,
  serviceTransactionTypes
}: Props) {
  const [transactionType, setTransactionType] = useState(
    serviceTransactionTypes[0]
  );
  const { data: hasMLJob = false, status } = useFetcher(
    () => getHasMLJob({ serviceName, transactionType }),
    [serviceName, transactionType]
  );

  const isLoadingMLJob = status === FETCH_STATUS.LOADING;

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.enableAnomalyDetectionTitle',
              {
                defaultMessage: 'Enable anomaly detection'
              }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {hasMLJob && (
          <div>
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.jobExistsTitle',
                {
                  defaultMessage: 'Job already exists'
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
                      transactionType
                    }
                  }
                )}{' '}
                <MLJobLink
                  serviceName={serviceName}
                  transactionType={transactionType}
                >
                  {i18n.translate(
                    'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.jobExistsDescription.viewJobLinkText',
                    {
                      defaultMessage: 'View existing job'
                    }
                  )}
                </MLJobLink>
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}

        {!hasIndexPattern && (
          <div>
            <EuiCallOut
              title={
                <span>
                  <FormattedMessage
                    id="xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.noPatternTitle"
                    defaultMessage="No APM index pattern available. To create a job, please import the APM index pattern via the {setupInstructionLink}"
                    values={{
                      setupInstructionLink: (
                        <KibanaLink path={`/home/tutorial/apm`}>
                          {i18n.translate(
                            'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.callout.noPatternTitle.setupInstructionLinkText',
                            {
                              defaultMessage: 'Setup Instructions'
                            }
                          )}
                        </KibanaLink>
                      )
                    }}
                  />
                </span>
              }
              color="warning"
              iconType="alert"
            />
            <EuiSpacer size="m" />
          </div>
        )}

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createMLJobDescription"
              defaultMessage="Here you can create a machine learning job to calculate anomaly scores on durations for APM transactions
                    within the {serviceName} service. Once enabled, {transactionDurationGraphText} will show the expected bounds and annotate
                    the graph once the anomaly score is &gt;=75."
              values={{
                serviceName,
                transactionDurationGraphText: (
                  <b>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createMLJobDescription.transactionDurationGraphText',
                      {
                        defaultMessage: 'the transaction duration graph'
                      }
                    )}
                  </b>
                )
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription"
              defaultMessage="Jobs can be created for each service + transaction type combination.
                    Once a job is created, you can manage it and see more details in the {mlJobsPageLink}."
              values={{
                mlJobsPageLink: (
                  <MLLink>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription.mlJobsPageLinkText',
                      {
                        defaultMessage: 'Machine Learning jobs management page'
                      }
                    )}
                  </MLLink>
                )
              }}
            />{' '}
            <em>
              {i18n.translate(
                'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription.noteText',
                {
                  defaultMessage:
                    'Note: It might take a few minutes for the job to begin calculating results.'
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
            {serviceTransactionTypes.length > 1 ? (
              <TransactionSelect
                selectedTransactionType={transactionType}
                transactionTypes={serviceTransactionTypes}
                onChange={(value: string) => {
                  setTransactionType(value);
                }}
              />
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton
                onClick={() => onClickCreate({ transactionType })}
                fill
                disabled={
                  isCreatingJob ||
                  hasMLJob ||
                  !hasIndexPattern ||
                  isLoadingMLJob
                }
              >
                {i18n.translate(
                  'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.createNewJobButtonLabel',
                  {
                    defaultMessage: 'Create new job'
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
