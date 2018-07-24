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
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { deleteJobs } from '../utils';

export class DeleteJobModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobs: [],
      isModalVisible: false,
      deleting: false,
    };

    this.refreshJobs = this.props.refreshJobs;
  }

  componentDidMount() {
    if (typeof this.props.setShowFunction === 'function') {
      this.props.setShowFunction(this.showModal);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetShowFunction === 'function') {
      this.props.unsetShowFunction();
    }
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (jobs) => {
    this.setState({
      jobs,
      isModalVisible: true,
      deleting: false,
    });
  }

  deleteJob = () => {
    this.setState({ deleting: true });
    deleteJobs(this.state.jobs, () => {
      this.refreshJobs();
      this.closeModal();
    });
  }

  setEL = (el) => {
    if (el) {
      this.el = el;
    }
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {

      if (this.el && this.state.deleting === true) {
        // work around to disable the modal's buttons if the jobs are being deleted
        this.el.confirmButton.style.display = 'none';
        this.el.cancelButton.textContent = 'Close';
      }

      const title = `Delete ${(this.state.jobs.length > 1) ? `${this.state.jobs.length} jobs` : this.state.jobs[0].id}`;
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            ref={this.setEL}
            title={title}
            onCancel={this.closeModal}
            onConfirm={this.deleteJob}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            className="eui-textBreakWord"
          >
            {(this.state.deleting === true) &&
              <div>
                Deleting jobs
                <EuiSpacer />
                <div style={{ textAlign: 'center' }}>
                  <EuiLoadingSpinner size="l"/>
                </div>
              </div>
            }

            {(this.state.deleting === false) &&
              <React.Fragment>
                <p>Are you sure you want to delete {(this.state.jobs.length > 1) ? 'these jobs' : 'this job'}?</p>
                {(this.state.jobs.length > 1) &&
                  <p>Deleting multiple jobs can be time consuming.
                    They will be deleted in the background and may not disappear from the jobs list instantly
                  </p>
                }
              </React.Fragment>
            }

          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <div>
        {modal}
      </div>
    );
  }
}

DeleteJobModal.propTypes = {
  setShowFunction: PropTypes.func.isRequired,
  unsetShowFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
