/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering a modal to confirm deletion of a rule.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiConfirmModal,
  EuiLink,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class DeleteRuleModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };
  }

  deleteRule = () => {
    const { ruleIndex, deleteRuleAtIndex } = this.props;
    deleteRuleAtIndex(ruleIndex);
    this.closeModal();
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = () => {
    this.setState({ isModalVisible: true });
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={<FormattedMessage
              id="xpack.ml.ruleEditor.deleteRuleModal.deleteRuleTitle"
              defaultMessage="Delete rule"
            />}
            onCancel={this.closeModal}
            onConfirm={this.deleteRule}
            cancelButtonText={<FormattedMessage
              id="xpack.ml.ruleEditor.deleteRuleModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />}
            confirmButtonText={<FormattedMessage
              id="xpack.ml.ruleEditor.deleteRuleModal.deleteButtonLabel"
              defaultMessage="Delete"
            />}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              <FormattedMessage
                id="xpack.ml.ruleEditor.deleteRuleModal.deleteRuleDescription"
                defaultMessage="Are you sure you want to delete this rule?"
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <React.Fragment>
        <EuiLink
          color="danger"
          onClick={() => this.showModal()}
        >
          <FormattedMessage
            id="xpack.ml.ruleEditor.deleteRuleModal.deleteRuleLinkText"
            defaultMessage="Delete rule"
          />
        </EuiLink>
        {modal}
      </React.Fragment>
    );
  }
}
DeleteRuleModal.propTypes = {
  ruleIndex: PropTypes.number.isRequired,
  deleteRuleAtIndex: PropTypes.func.isRequired
};
