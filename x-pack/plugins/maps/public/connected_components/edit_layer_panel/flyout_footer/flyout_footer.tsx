/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ILayer } from '../../../classes/layers/layer';
import { RemoveLayerConfirmModal } from '../../../components/remove_layer_confirm_modal';

export interface Props {
  selectedLayer?: ILayer;
  cancelLayerPanel: () => void;
  saveLayerEdits: () => void;
  removeLayer: () => void;
  hasStateChanged: boolean;
}

interface State {
  showRemoveModal: boolean;
}

export class FlyoutFooter extends Component<Props, State> {
  state: State = {
    showRemoveModal: false,
  };

  _showRemoveModal = () => {
    this.setState({ showRemoveModal: true });
  };

  render() {
    const cancelButtonLabel = this.props.hasStateChanged ? (
      <FormattedMessage
        id="xpack.maps.layerPanel.footer.cancelButtonLabel"
        defaultMessage="Cancel"
      />
    ) : (
      <FormattedMessage id="xpack.maps.layerPanel.footer.closeButtonLabel" defaultMessage="Close" />
    );

    const removeModal =
      this.props.selectedLayer && this.state.showRemoveModal ? (
        <RemoveLayerConfirmModal
          layer={this.props.selectedLayer}
          onCancel={() => {
            this.setState({ showRemoveModal: false });
          }}
          onConfirm={() => {
            this.setState({ showRemoveModal: false });
            this.props.removeLayer();
          }}
        />
      ) : null;

    return (
      <>
        {removeModal}
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={this.props.cancelLayerPanel}
              flush="left"
              data-test-subj="layerPanelCancelButton"
            >
              {cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="danger"
              onClick={this._showRemoveModal}
              flush="right"
              data-test-subj="mapRemoveLayerButton"
            >
              <FormattedMessage
                id="xpack.maps.layerPanel.footer.removeLayerButtonLabel"
                defaultMessage="Remove layer"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!this.props.hasStateChanged}
              iconType="check"
              onClick={this.props.saveLayerEdits}
              fill
            >
              <FormattedMessage
                id="xpack.maps.layerPanel.footer.saveAndCloseButtonLabel"
                defaultMessage="Save & close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
}
