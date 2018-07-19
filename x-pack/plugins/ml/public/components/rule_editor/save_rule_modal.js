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
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';


/*
 * React modal for validating and saving edits to a rule.
 */
export class SaveRuleModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false
    };
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = () => {
    this.setState({ isModalVisible: true });
  }

  validateAndSave = () => {
    this.setState({ isModalVisible: true });
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title="Save rule"
            onCancel={this.closeModal}
            onConfirm={this.onConfirmDelete}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              Invalid rule
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <div>
        <EuiButton
          onClick={this.validateAndSave}
          fill
        >
          Save
        </EuiButton>

        {modal}
      </div>
    );
  }
}
SaveRuleModal.propTypes = {
  job: PropTypes.object.isRequired,
  detectorIndex: PropTypes.number.isRequired,
  rule: PropTypes.object.isRequired,
  ruleIndex: PropTypes.number.isRequired
};


