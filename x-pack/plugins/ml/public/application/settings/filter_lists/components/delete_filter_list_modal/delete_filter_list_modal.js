/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { context } from '@kbn/kibana-react-plugin/public';

import { EuiButton, EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { deleteFilterLists } from './delete_filter_lists';

/*
 * React modal for confirming deletion of filter lists.
 */
export class DeleteFilterListModal extends Component {
  static contextType = context;

  static displayName = 'DeleteFilterListModal';
  static propTypes = {
    selectedFilterLists: PropTypes.array,
    canDeleteFilter: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  };

  showModal = () => {
    this.setState({ isModalVisible: true });
  };

  onConfirmDelete = () => {
    this.doDelete();
  };

  async doDelete() {
    const { selectedFilterLists, refreshFilterLists } = this.props;
    await deleteFilterLists(
      this.context.services.notifications.toasts,
      this.context.services.mlServices.mlApiServices,
      selectedFilterLists
    );

    refreshFilterLists();
    this.closeModal();
  }

  render() {
    const { selectedFilterLists, canDeleteFilter } = this.props;
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <EuiConfirmModal
          title={i18n.translate('xpack.ml.settings.filterLists.deleteFilterListModal.modalTitle', {
            defaultMessage:
              'Delete {selectedFilterListsLength, plural, one {{selectedFilterId}} other {# filter lists}}?',
            values: {
              selectedFilterListsLength: selectedFilterLists.length,
              selectedFilterId: !!selectedFilterLists.length && selectedFilterLists[0].filter_id,
            },
          })}
          className="eui-textBreakWord"
          onCancel={this.closeModal}
          onConfirm={this.onConfirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.ml.settings.filterLists.deleteFilterListModal.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.ml.settings.filterLists.deleteFilterListModal.confirmButtonLabel',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          data-test-subj={'mlFilterListDeleteConfirmation'}
        />
      );
    }

    return (
      <div>
        <EuiButton
          key="delete_filter_list"
          iconType="trash"
          color="danger"
          onClick={this.showModal}
          isDisabled={
            selectedFilterLists === undefined ||
            selectedFilterLists.length === 0 ||
            canDeleteFilter === false
          }
          data-test-subj="mlFilterListsDeleteButton"
        >
          <FormattedMessage
            id="xpack.ml.settings.filterLists.deleteFilterListModal.deleteButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>

        {modal}
      </div>
    );
  }
}
