/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiTitle,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { QueryBar } from 'ui/query_bar';
import { indexPatternService } from '../../../kibana_services';
import { Storage } from 'ui/storage';

const settings = chrome.getUiSettingsClient();
const localStorage = new Storage(window.localStorage);

export class FilterEditor extends Component {

  state = {
    isModalOpen: false,
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
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._closeModal();
  }

  _renderModal() {
    if (!this.state.isModalOpen) {
      return null;
    }

    const layerQuery = this.props.layer.getQuery();

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
                defaultMessage="Set layer filter"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody className="mapFilterEditorModalBody">
            <QueryBar
              query={layerQuery ? layerQuery : { language: settings.get('search:queryLanguage'), query: '' }}
              onSubmit={this._onQueryChange}
              appName="maps"
              showDatePicker={false}
              indexPatterns={this.state.indexPatterns}
              store={localStorage}
              customSubmitButton={
                <EuiButton
                  fill
                >
                  <FormattedMessage
                    id="xpack.maps.layerPanel.filterEditor.modal.queryBarSubmitButtonLabel"
                    defaultMessage="Set filter"
                  />
                </EuiButton>
              }
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

          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  _renderQuery() {
    const query = this.props.layer.getQuery();
    if (!query || !query.query) {
      return null;
    }

    return (
      <Fragment>
        <EuiCodeBlock>
          {query.query}
        </EuiCodeBlock>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderOpenModalButton() {
    const query = this.props.layer.getQuery();
    const openModalButtonLabel = query && query.query
      ? i18n.translate('xpack.maps.layerPanel.filterEditor.editFilterButtonLabel', {
        defaultMessage: 'Edit filter'
      })
      : i18n.translate('xpack.maps.layerPanel.filterEditor.addFilterButtonLabel', {
        defaultMessage: 'Add filter'
      });

    return (
      <EuiButton
        onClick={this._openModal}
      >
        {openModalButtonLabel}
      </EuiButton>
    );
  }

  render() {
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

        {this._renderQuery()}

        {this._renderOpenModalButton()}

        {this._renderModal()}
      </Fragment>
    );
  }
}
