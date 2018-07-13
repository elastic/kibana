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

import { toastNotifications } from 'ui/notify';
import { ml } from 'plugins/ml/services/ml_api_service';

/*
 * React modal for confirming deletion of filter lists.
 */
export class DeleteFilterListModal extends Component {
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
    this.setState({
      isModalVisible: true,
    });
  }

  deleteFilterLists = () => {
    this.doDelete();
  }

  async doDelete() {
    // Delete each of the specified filter lists in turn, waiting for each response
    // before deleting the next to minimize load on the cluster.
    const { selectedFilterLists, refreshFilterLists } = this.props;

    const messageId = `${(selectedFilterLists.length > 1) ?
      `${selectedFilterLists.length} filter lists` : selectedFilterLists[0].filter_id}`;
    toastNotifications.add(`Deleting ${messageId}`);

    for(const filterList of selectedFilterLists) {
      const filterId = filterList.filter_id;
      try {
        await ml.filters.deleteFilter(filterId);
      } catch (resp) {
        console.log('Error deleting filter list:', resp);
        let errorMessage = `An error occurred deleting filter list ${filterList.filter_id}`;
        if (resp.message) {
          errorMessage += ` : ${resp.message}`;
        }
        toastNotifications.addDanger(errorMessage);
      }
    }

    refreshFilterLists();
    toastNotifications.addSuccess(`${messageId} deleted`);
    this.closeModal();
  }

  render() {
    const { selectedFilterLists } = this.props;
    let modal;

    if (this.state.isModalVisible) {
      const title = `Delete ${(selectedFilterLists.length > 1) ?
        `${selectedFilterLists.length} filter lists` : selectedFilterLists[0].filter_id}`;
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={title}
            className="eui-textBreakWord"
            onCancel={this.closeModal}
            onConfirm={this.deleteFilterLists}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              Are you sure you want to delete {(selectedFilterLists.length > 1) ?
                'these filter lists' : 'this filter list'}?
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <div>
        <EuiButton
          key="delete_filter_list"
          iconType="trash"
          color="danger"
          onClick={this.showModal}
          isDisabled={selectedFilterLists.length === 0}
        >
          Delete
        </EuiButton>

        {modal}
      </div>
    );
  }
}
DeleteFilterListModal.propTypes = {
  selectedFilterLists: PropTypes.array.isRequired,
};


