/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { MLJobLink } from 'x-pack/plugins/apm/public/components/shared/Links/MLJobLink';
import { startMLJob } from 'x-pack/plugins/apm/public/services/rest/ml';
import { getAPMIndexPattern } from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { MachineLearningFlyoutView } from './view';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  urlParams: IUrlParams;
  location: Location;
  serviceTransactionTypes: string[];
}

interface State {
  isCreatingJob: boolean;
  hasMLJob: boolean;
  hasIndexPattern: boolean;
  selectedTransactionType?: string;
}

export class MachineLearningFlyout extends Component<Props, State> {
  public state: State = {
    isCreatingJob: false,
    hasIndexPattern: false,
    hasMLJob: false,
    selectedTransactionType: this.props.urlParams.transactionType
  };
  public willUnmount = false;

  public componentWillUnmount() {
    this.willUnmount = true;
  }

  public async componentDidMount() {
    const indexPattern = await getAPMIndexPattern();
    if (!this.willUnmount) {
      // TODO: this is causing warning from react because setState happens after
      // the component has been unmounted - dispite of the checks
      this.setState({ hasIndexPattern: !!indexPattern });
    }
  }

  // TODO: This should use `getDerivedStateFromProps`
  public componentDidUpdate(prevProps: Props) {
    if (
      prevProps.urlParams.transactionType !==
      this.props.urlParams.transactionType
    ) {
      this.setState({
        selectedTransactionType: this.props.urlParams.transactionType
      });
    }
  }

  public onClickCreate = async () => {
    this.setState({ isCreatingJob: true });
    try {
      const { serviceName, transactionType } = this.props.urlParams;
      if (!serviceName || !transactionType) {
        throw new Error(
          'Service name and transaction type are required to create this ML job'
        );
      }
      const res = await startMLJob({ serviceName, transactionType });
      const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
      if (!didSucceed) {
        throw new Error('Creating ML job failed');
      }
      this.addSuccessToast();
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

  public addSuccessToast = () => {
    const { location, urlParams } = this.props;
    const { serviceName, transactionType } = urlParams;

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

  public onChangeTransaction(value: string) {
    this.setState({
      selectedTransactionType: value
    });
  }

  public render() {
    const {
      isOpen,
      onClose,
      urlParams,
      location,
      serviceTransactionTypes
    } = this.props;
    const { serviceName, transactionType } = urlParams;
    const {
      isCreatingJob,
      hasIndexPattern,
      selectedTransactionType
    } = this.state;

    if (!isOpen || !serviceName) {
      return null;
    }

    return (
      <MachineLearningFlyoutView
        hasIndexPattern={hasIndexPattern}
        isCreatingJob={isCreatingJob}
        location={location}
        onChangeTransaction={this.onChangeTransaction}
        onClickCreate={this.onClickCreate}
        onClose={onClose}
        selectedTransactionType={selectedTransactionType}
        serviceName={serviceName}
        serviceTransactionTypes={serviceTransactionTypes}
        transactionType={transactionType}
      />
    );
  }
}
