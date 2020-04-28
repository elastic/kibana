/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { SourceSelect } from './source_select/source_select';
import { FlyoutFooter } from './flyout_footer';
import { ImportEditor } from './import_editor';
import { EuiButtonEmpty, EuiPanel, EuiTitle, EuiFlyoutHeader, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export class AddLayerPanel extends Component {
  state = {
    layerWizard: null,
    layerDescriptor: null, // TODO get this from redux store instead of storing locally
    isIndexingSource: false,
    importView: false,
    layerImportAddReady: false,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (!this.state.layerImportAddReady && this.props.isIndexingSuccess) {
      this.setState({ layerImportAddReady: true });
    }
  }

  _getPanelDescription() {
    const { importView, layerImportAddReady } = this.state;
    let panelDescription;
    if (layerImportAddReady || !importView) {
      panelDescription = i18n.translate('xpack.maps.addLayerPanel.addLayer', {
        defaultMessage: 'Add layer',
      });
    } else {
      panelDescription = i18n.translate('xpack.maps.addLayerPanel.importFile', {
        defaultMessage: 'Import file',
      });
    }
    return panelDescription;
  }

  _previewLayer = async (layerDescriptor, isIndexingSource) => {
    if (!this._isMounted) {
      return;
    }
    if (!layerDescriptor) {
      this.setState({
        layerDescriptor: null,
        isIndexingSource: false,
      });
      this.props.removeTransientLayer();
      return;
    }

    this.setState({ layerDescriptor, isIndexingSource });
    this.props.previewLayer(layerDescriptor);
  };

  _clearLayerData = ({ keepSourceType = false }) => {
    if (!this._isMounted) {
      return;
    }

    this.setState({
      layerDescriptor: null,
      isIndexingSource: false,
      ...(!keepSourceType ? { layerWizard: null, importView: false } : {}),
    });
    this.props.removeTransientLayer();
  };

  _onSourceSelectionChange = ({ layerWizard, isIndexingSource }) => {
    this.setState({ layerWizard, importView: isIndexingSource });
  };

  _layerAddHandler = () => {
    if (this.state.isIndexingSource && !this.props.isIndexingTriggered) {
      this.props.setIndexingTriggered();
    } else {
      this.props.selectLayerAndAdd();
      if (this.state.importView) {
        this.setState({
          layerImportAddReady: false,
        });
        this.props.resetIndexing();
      }
    }
  };

  _renderPanelBody() {
    if (!this.state.layerWizard) {
      return <SourceSelect updateSourceSelection={this._onSourceSelectionChange} />;
    }

    const backButton = this.props.isIndexingTriggered ? null : (
      <Fragment>
        <EuiButtonEmpty size="xs" flush="left" onClick={this._clearLayerData} iconType="arrowLeft">
          <FormattedMessage
            id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
            defaultMessage="Change layer"
          />
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
      </Fragment>
    );

    if (this.state.importView) {
      return (
        <Fragment>
          {backButton}
          <ImportEditor
            clearSource={this._clearLayerData}
            previewLayer={this._previewLayer}
            mapColors={this.props.mapColors}
            onRemove={() => this._clearLayerData({ keepSourceType: true })}
          />
        </Fragment>
      );
    }

    return (
      <Fragment>
        {backButton}
        <EuiPanel>
          {this.state.layerWizard.renderWizard({
            previewLayer: this._previewLayer,
            mapColors: this.props.mapColors,
          })}
        </EuiPanel>
      </Fragment>
    );
  }

  render() {
    if (!this.props.flyoutVisible) {
      return null;
    }

    const panelDescription = this._getPanelDescription();
    const isNextBtnEnabled = this.state.importView
      ? this.props.isIndexingReady || this.props.isIndexingSuccess
      : !!this.state.layerDescriptor;

    return (
      <Fragment>
        <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
          <EuiTitle size="s">
            <h2>{panelDescription}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
          <div className="mapLayerPanel__bodyOverflow">{this._renderPanelBody()}</div>
        </div>

        <FlyoutFooter
          showNextButton={!!this.state.layerWizard}
          disableNextButton={!isNextBtnEnabled}
          onClick={this._layerAddHandler}
          nextButtonText={panelDescription}
        />
      </Fragment>
    );
  }
}
