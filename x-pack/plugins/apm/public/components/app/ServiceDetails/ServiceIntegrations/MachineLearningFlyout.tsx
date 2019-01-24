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
import { Location } from 'history';
import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { MLJobLink } from 'x-pack/plugins/apm/public/components/shared/Links/MLJobLink';
import {
  getMlPrefix,
  startMLJob
} from 'x-pack/plugins/apm/public/services/rest/ml';
import { getAPMIndexPattern } from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { MLJobsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/machineLearningJobs';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { TransactionSelect } from './TransactionSelect';

interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  urlParams: IUrlParams;
  location: Location;
  serviceTransactionTypes: string[];
}

interface FlyoutState {
  isLoading: boolean;
  hasMLJob: boolean;
  hasIndexPattern: boolean;
  selectedTransactionType?: string;
}

export class MachineLearningFlyout extends Component<FlyoutProps, FlyoutState> {
  public state = {
    isLoading: false,
    hasIndexPattern: false,
    hasMLJob: false,
    selectedTransactionType: this.props.urlParams.transactionType
  };

  public async componentDidMount() {
    const indexPattern = await getAPMIndexPattern();
    this.setState({ hasIndexPattern: !!indexPattern });
  }

  public componentDidUpdate(prevProps: FlyoutProps) {
    if (
      prevProps.urlParams.transactionType !==
      this.props.urlParams.transactionType
    ) {
      this.setState({
        selectedTransactionType: this.props.urlParams.transactionType
      });
    }
  }

  public createJob = async () => {
    this.setState({ isLoading: true });
    try {
      const { serviceName, transactionType } = this.props.urlParams;
      if (serviceName) {
        const res = await startMLJob({ serviceName, transactionType });
        const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
        if (!didSucceed) {
          throw new Error('Creating ML job failed');
        }
        this.addSuccessToast();
      }
    } catch (e) {
      this.addErrorToast();
    }

    this.setState({ isLoading: false });
    this.props.onClose();
  };

  public addErrorToast = () => {
    const { urlParams } = this.props;
    const { serviceName = 'unknown' } = urlParams;

    if (!serviceName) {
      return;
    }

    toastNotifications.addWarning({
      title: i18n.translate(
        'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
        {
          defaultMessage: 'Job creation failed'
        }
      ),
      text: (
        <p>
          {i18n.translate(
            'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
            {
              defaultMessage:
                'Your current license may not allow for creating machine learning jobs, or this job may already exist.'
            }
          )}
        </p>
      )
    });
  };

  public addSuccessToast = () => {
    const { location, urlParams } = this.props;
    const { serviceName = 'unknown', transactionType } = urlParams;

    toastNotifications.addSuccess({
      title: i18n.translate(
        'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationTitle',
        {
          defaultMessage: 'Job successfully created'
        }
      ),
      text: (
        <p>
          {i18n.translate(
            'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationText',
            {
              defaultMessage:
                'The analysis is now running for {serviceName} ({transactionType}). It might take a while before results are added to the response times graph.',
              values: {
                serviceName,
                transactionType
              }
            }
          )}{' '}
          <MLJobLink
            serviceName={serviceName}
            transactionType={transactionType}
            location={location}
          >
            {i18n.translate(
              'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationText.viewJobLinkText',
              {
                defaultMessage: 'View job'
              }
            )}
          </MLJobLink>
        </p>
      )
    });
  };

  public render() {
    const { isOpen, onClose, urlParams, location } = this.props;
    const { serviceName, transactionType } = urlParams;
    const { isLoading, hasIndexPattern, selectedTransactionType } = this.state;

    if (!isOpen || !serviceName) {
      return null;
    }

    return (
      <MLJobsRequest
        serviceName={serviceName}
        render={({ data, status }) => {
          if (status === 'LOADING') {
            return null;
          }

          const hasMLJob = data.jobs.some(
            job =>
              job.jobId &&
              job.jobId.startsWith(
                getMlPrefix(serviceName, selectedTransactionType)
              )
          );

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
                          location={location}
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
                                <KibanaLink
                                  pathname={'/app/kibana'}
                                  hash={`/home/tutorial/apm`}
                                >
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
                          <KibanaLink pathname={'/app/ml'}>
                            {i18n.translate(
                              'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.manageMLJobDescription.mlJobsPageLinkText',
                              {
                                defaultMessage:
                                  'Machine Learning jobs management page'
                              }
                            )}
                          </KibanaLink>
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
                <EuiFlexGroup
                  justifyContent="spaceBetween"
                  alignItems="flexEnd"
                >
                  <EuiFlexItem>
                    {this.props.serviceTransactionTypes.length > 1 ? (
                      <TransactionSelect
                        types={this.props.serviceTransactionTypes}
                        selected={this.state.selectedTransactionType}
                        existingJobs={data.jobs}
                        onChange={value =>
                          this.setState({
                            selectedTransactionType: value
                          })
                        }
                      />
                    ) : null}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow>
                      <EuiButton
                        onClick={this.createJob}
                        fill
                        disabled={isLoading || hasMLJob || !hasIndexPattern}
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
        }}
      />
    );
  }
}
