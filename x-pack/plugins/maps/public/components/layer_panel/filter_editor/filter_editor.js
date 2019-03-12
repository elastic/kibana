/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { QueryBar } from 'ui/query_bar';

export class FilterEditor extends Component {

  state = {
    isModalOpen: false,
    query: { language: 'kuery', query: '' },
  }

  _openModal = () => {
    this.setState({ isModalOpen: true });
  }

  _closeModal = () => {
    this.setState({ isModalOpen: false });
  }

  _onQueryChange = ({ query }) => {

  }

  _renderModal() {
    if (!this.state.isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiModal
          onClose={this._closeModal}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle >
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.modal.headerTitle"
                defaultMessage="Add a layer filter"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <QueryBar
              query={this.state.query}
              onSubmit={this._onQueryChange}
              appName="maps"
              showUpdateButton={false}
              showDatePicker={false}

            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={this._closeModal}
            >
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.modal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              onClick={this._closeModal}
              fill
            >
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.modal.saveButtonLabel"
                defaultMessage="Add filter"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  render() {
    const openModalButtonLabel = i18n.translate('xpack.maps.layerPanel.filterEditor.addFilterButtonLabel', {
      defaultMessage: 'Add a filter'
    });
    return (
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.filterEditor.title"
              defaultMessage="Filter"
            />
          </h5>
        </EuiTitle>
        <EuiButton
          onClick={this._openModal}
        >
          {openModalButtonLabel}
        </EuiButton>

        {this._renderModal()}
      </Fragment>
    );
  }
}
