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
import { indexPatternService } from '../../../kibana_services';

export class FilterEditor extends Component {

  state = {
    isModalOpen: false,
    query: { language: 'kuery', query: '' },
    indexPatterns: [],
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadIndexPatterns();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadIndexPatterns = async () => {
    const indexPatternIds = this.props.layer.getIndexPatternIds();
    const indexPatterns = [];
    const getIndexPatternPromises = indexPatternIds.map(async (indexPatternId) => {
      try {
        const indexPattern = await indexPatternService.get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch(err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);

    if (!this._isMounted) {
      return;
    }

    this.setState({ indexPatterns });
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
          maxWidth={false}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle >
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.modal.headerTitle"
                defaultMessage="Add a layer filter"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody style={{ width: '75vw', height: '50vh' }}>
            <QueryBar
              query={this.state.query}
              onSubmit={this._onQueryChange}
              appName="maps"
              showUpdateButton={false}
              showDatePicker={false}
              indexPatterns={this.state.indexPatterns}
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
