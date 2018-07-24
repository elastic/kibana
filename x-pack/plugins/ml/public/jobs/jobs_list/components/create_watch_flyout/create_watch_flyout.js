/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

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

import { toastNotifications } from 'ui/notify';
import { loadFullJob } from '../utils';
import { mlCreateWatchService } from '../../../../jobs/new_job/simple/components/watcher/create_watch_service';
import { CreateWatch } from '../../../../jobs/new_job/simple/components/watcher/create_watch_view';


function getSuccessToast(id, url) {
  return {
    title: `Watch ${id} created successfully`,
    text: (
      <React.Fragment>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              href={url}
              target="_blank"
              iconType="link"
            >
              Edit watch
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </React.Fragment>
    )
  };
}

export class CreateWatchFlyout extends Component {
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

  closeFlyout = () => {
    this.setState({ isFlyoutVisible: false });
  }

  showFlyout = (jobId) => {
    loadFullJob(jobId)
    	.then((job) => {
        const bucketSpan = job.analysis_config.bucket_span;
        mlCreateWatchService.config.includeInfluencers = (job.analysis_config.influencers.length > 0);

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
  }

  save = () => {
    mlCreateWatchService.createNewWatch(this.state.jobId)
    	.then((resp) => {
        toastNotifications.addSuccess(getSuccessToast(resp.id, resp.url));
        this.closeFlyout();
      })
      .catch((error) => {
        toastNotifications.addDanger(`Could not save watch`);
        console.error(error);
      });
  }


  render() {
    const {
      jobId,
      bucketSpan
    } = this.state;

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
                Create watch for {jobId}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>

            <CreateWatch
              jobId={jobId}
              bucketSpan={bucketSpan}
            />

          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeFlyout}
                  flush="left"
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={this.save}
                  fill
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }
    return (
      <div>
        {flyout}
      </div>
    );

  }
}
CreateWatchFlyout.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
};

