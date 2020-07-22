/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { loadFullJob } from '../utils';
import { mlCreateWatchService } from './create_watch_service';
import { CreateWatch } from './create_watch_view';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { withKibana } from '../../../../../../../../../src/plugins/kibana_react/public';

function getSuccessToast(id, url) {
  return {
    title: i18n.translate(
      'xpack.ml.jobsList.createWatchFlyout.watchCreatedSuccessfullyNotificationMessage',
      {
        defaultMessage: 'Watch {id} created successfully',
        values: { id },
      }
    ),
    text: (
      <React.Fragment>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" href={url} target="_blank" iconType="link">
              {i18n.translate('xpack.ml.jobsList.createWatchFlyout.editWatchButtonLabel', {
                defaultMessage: 'Edit watch',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </React.Fragment>
    ),
  };
}

export class CreateWatchFlyoutUI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobId: null,
      bucketSpan: null,
    };
  }

  componentDidMount() {
    if (typeof this.props.setShowFunction === 'function') {
      this.props.setShowFunction(this.showFlyout);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetShowFunction === 'function') {
      this.props.unsetShowFunction();
    }
  }

  closeFlyout = (watchCreated = false) => {
    this.setState({ isFlyoutVisible: false }, () => {
      if (typeof this.props.flyoutHidden === 'function') {
        this.props.flyoutHidden(watchCreated);
      }
    });
  };

  showFlyout = (jobId) => {
    loadFullJob(jobId)
      .then((job) => {
        const bucketSpan = job.analysis_config.bucket_span;
        mlCreateWatchService.config.includeInfluencers = job.analysis_config.influencers.length > 0;

        this.setState({
          job,
          jobId,
          bucketSpan,
          isFlyoutVisible: true,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  save = () => {
    const { toasts } = this.props.kibana.services.notifications;
    mlCreateWatchService
      .createNewWatch(this.state.jobId)
      .then((resp) => {
        toasts.addSuccess(getSuccessToast(resp.id, resp.url));
        this.closeFlyout(true);
      })
      .catch((error) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.createWatchFlyout.watchNotSavedErrorNotificationMessage',
            {
              defaultMessage: 'Could not save watch',
            }
          )
        );
        console.error(error);
      });
  };

  render() {
    const { jobId, bucketSpan } = this.state;

    let flyout;

    if (this.state.isFlyoutVisible) {
      flyout = (
        <EuiFlyout
          // ownFocus
          onClose={this.closeFlyout}
          size="s"
        >
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.ml.jobsList.createWatchFlyout.pageTitle"
                  defaultMessage="Create watch for {jobId}"
                  values={{ jobId }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <CreateWatch jobId={jobId} bucketSpan={bucketSpan} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={this.closeFlyout} flush="left">
                  <FormattedMessage
                    id="xpack.ml.jobsList.createWatchFlyout.closeButtonLabel"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.save} fill>
                  <FormattedMessage
                    id="xpack.ml.jobsList.createWatchFlyout.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }
    return <div>{flyout}</div>;
  }
}
CreateWatchFlyoutUI.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  flyoutHidden: PropTypes.func,
};

export const CreateWatchFlyout = withKibana(CreateWatchFlyoutUI);
