/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { startMLJob } from '../../../../../services/rest/ml';
import { getAPMIndexPattern } from '../../../../../services/rest/savedObjects';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';
import { MLJobLink } from '../../../../shared/Links/MachineLearningLinks/MLJobLink';
import { MachineLearningFlyoutView } from './view';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}

interface State {
  isCreatingJob: boolean;
  hasIndexPattern: boolean;
}

export class MachineLearningFlyout extends Component<Props, State> {
  public state: State = {
    isCreatingJob: false,
    hasIndexPattern: false
  };
  public mounted = false;

  public componentWillUnmount() {
    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    const indexPattern = await getAPMIndexPattern();

    // setTimeout:0 hack forces the state update to wait for next tick
    // in case the component is mid-unmount :/
    setTimeout(() => {
      if (!this.mounted) {
        return;
      }
      this.setState({
        hasIndexPattern: !!indexPattern
      });
    }, 0);
  }

  public onClickCreate = async ({
    transactionType
  }: {
    transactionType: string;
  }) => {
    this.setState({ isCreatingJob: true });
    try {
      const { serviceName } = this.props.urlParams;
      if (!serviceName) {
        throw new Error('Service name is required to create this ML job');
      }
      const res = await startMLJob({ serviceName, transactionType });
      const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
      if (!didSucceed) {
        throw new Error('Creating ML job failed');
      }
      this.addSuccessToast({ transactionType });
    } catch (e) {
      this.addErrorToast();
    }

    this.setState({ isCreatingJob: false });
    this.props.onClose();
  };

  public addErrorToast = () => {
    const { urlParams } = this.props;
    const { serviceName } = urlParams;

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

  public addSuccessToast = ({
    transactionType
  }: {
    transactionType: string;
  }) => {
    const { urlParams } = this.props;
    const { serviceName } = urlParams;

    if (!serviceName) {
      return;
    }

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
    const { isOpen, onClose, urlParams, serviceTransactionTypes } = this.props;
    const { serviceName } = urlParams;
    const { isCreatingJob, hasIndexPattern } = this.state;

    if (!isOpen || !serviceName) {
      return null;
    }

    return (
      <MachineLearningFlyoutView
        hasIndexPattern={hasIndexPattern}
        isCreatingJob={isCreatingJob}
        onClickCreate={this.onClickCreate}
        onClose={onClose}
        serviceName={serviceName}
        serviceTransactionTypes={serviceTransactionTypes}
      />
    );
  }
}
