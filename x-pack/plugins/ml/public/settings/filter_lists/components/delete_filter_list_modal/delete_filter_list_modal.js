/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { checkPermission } from '../../../../privilege/check_privilege';
import { deleteFilterLists } from './delete_filter_lists';

/*
 * React modal for confirming deletion of filter lists.
 */
export const DeleteFilterListModal = injectI18n(class extends Component {
  static displayName = 'DeleteFilterListModal';
  static propTypes = {
    selectedFilterLists: PropTypes.array,
  };

  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false
    };
    this.canDeleteFilter = checkPermission('canDeleteFilter');
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showModal = () => {
    this.setState({ isModalVisible: true });
  }

  onConfirmDelete = () => {
    this.doDelete();
  }

  async doDelete() {
    const { selectedFilterLists, refreshFilterLists } = this.props;
    await deleteFilterLists(selectedFilterLists);

    refreshFilterLists();
    this.closeModal();
  }

  render() {
    const { selectedFilterLists, intl } = this.props;
    let modal;

    if (this.state.isModalVisible) {
      const title = intl.formatMessage({
        id: 'xpack.ml.settings.deleteFilterListModal.modalTitle',
        defaultMessage: 'Delete {selectedFilterListsLength, plural, one {{selectedFilterId}} other {# filter lists}}',
      }, {
        selectedFilterListsLength: selectedFilterLists.length,
        selectedFilterId: !!selectedFilterLists.length && selectedFilterLists[0].filter_id,
      });
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={title}
            className="eui-textBreakWord"
            onCancel={this.closeModal}
            onConfirm={this.onConfirmDelete}
            cancelButtonText={intl.formatMessage(
              { id: 'xpack.ml.settings.deleteFilterListModal.cancelButtonLabel', defaultMessage: 'Cancel' })
            }
            confirmButtonText={intl.formatMessage(
              { id: 'xpack.ml.settings.deleteFilterListModal.confirmButtonLabel', defaultMessage: 'Delete' })
            }
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              <FormattedMessage
                id="xpack.ml.settings.deleteFilterListModal.deleteWarningMessage"
                defaultMessage="Are you sure you want to delete
{selectedFilterListsLength, plural, one {this filter list} other {these filter lists}}"
                values={{
                  selectedFilterListsLength: selectedFilterLists.length,
                }}
              />
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
          isDisabled={(selectedFilterLists === undefined || selectedFilterLists.length === 0 || this.canDeleteFilter === false)}
        >
          <FormattedMessage
            id="xpack.ml.settings.deleteFilterListModal.deleteButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>

        {modal}
      </div>
    );
  }
});
