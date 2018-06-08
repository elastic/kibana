/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

export class EditJobModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };

    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showModal);
    }
    this.job = this.props.job;
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = (job) => {
    if (job !== undefined) {
      this.job = job;
    }
    this.setState({ isModalVisible: true });
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiOverlayMask>
          <EuiModal
            onClose={this.closeModal}
            style={{ width: '800px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle >
                Edit {this.job.id}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              Contents
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty
                onClick={this.closeModal}
              >
                Cancel
              </EuiButtonEmpty>

              <EuiButton
                onClick={this.closeModal}
                fill
              >
                Save
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      );
    }
    // return (
    //   <div>
    //     <EuiText onClick={this.showModal}>
    //       <EuiIcon type="trash" />
    //       Edit job
    //     </EuiText>
    //     {modal}
    //   </React.Fragment>
    // );

    return (
      <div>
        {modal}
      </div>
    );

  }
}
