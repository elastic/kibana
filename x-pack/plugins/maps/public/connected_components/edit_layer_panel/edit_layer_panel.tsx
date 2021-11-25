/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiCallOut,
  EuiIcon,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterEditor } from './filter_editor';
import { JoinEditor, JoinField } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { LayerSettings } from './layer_settings';
import { StyleSettings } from './style_settings';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { getData, getCore } from '../../kibana_services';
import { ILayer } from '../../classes/layers/layer';
import { isVectorLayer, IVectorLayer } from '../../classes/layers/vector_layer';
import { ImmutableSourceProperty, OnSourceChangeArgs } from '../../classes/sources/source';
import { IField } from '../../classes/fields/field';

const localStorage = new Storage(window.localStorage);

export interface Props {
  clearJoins: (layer: ILayer) => void;
  selectedLayer?: ILayer;
  updateSourceProps: (layerId: string, sourcePropChanges: OnSourceChangeArgs[]) => Promise<void>;
}

interface State {
  displayName: string;
  immutableSourceProps: ImmutableSourceProperty[];
  leftJoinFields: JoinField[];
  supportsFitToBounds: boolean;
}

export class EditLayerPanel extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    displayName: '',
    immutableSourceProps: [],
    leftJoinFields: [],
    supportsFitToBounds: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadDisplayName();
    this._loadImmutableSourceProperties();
    this._loadLeftJoinFields();
    this._loadSupportsFitToBounds();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadSupportsFitToBounds = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const supportsFitToBounds = await this.props.selectedLayer.supportsFitToBounds();
    if (this._isMounted) {
      this.setState({ supportsFitToBounds });
    }
  };

  _loadDisplayName = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const displayName = await this.props.selectedLayer.getDisplayName();
    if (this._isMounted) {
      this.setState({ displayName });
    }
  };

  _loadImmutableSourceProperties = async () => {
    if (!this.props.selectedLayer) {
      return;
    }

    const immutableSourceProps = await this.props.selectedLayer.getImmutableSourceProperties();
    if (this._isMounted) {
      this.setState({ immutableSourceProps });
    }
  };

  async _loadLeftJoinFields() {
    if (!this.props.selectedLayer || !isVectorLayer(this.props.selectedLayer)) {
      return;
    }

    const vectorLayer = this.props.selectedLayer as IVectorLayer;
    if (!vectorLayer.showJoinEditor() || vectorLayer.getLeftJoinFields === undefined) {
      return;
    }

    let leftJoinFields: JoinField[] = [];
    try {
      const leftFieldsInstances = await (
        this.props.selectedLayer as IVectorLayer
      ).getLeftJoinFields();
      const leftFieldPromises = leftFieldsInstances.map(async (field: IField) => {
        return {
          name: field.getName(),
          label: await field.getLabel(),
        };
      });
      leftJoinFields = await Promise.all(leftFieldPromises);
    } catch (error) {
      // ignore exceptions getting fields, will bubble up in layer errors panel
    }
    if (this._isMounted) {
      this.setState({ leftJoinFields });
    }
  }

  _onSourceChange = (...args: OnSourceChangeArgs[]) => {
    return this.props.updateSourceProps(this.props.selectedLayer!.getId(), args);
  };

  _clearJoins = () => {
    if (this.props.selectedLayer) {
      this.props.clearJoins(this.props.selectedLayer);
    }
  };

  _renderLayerErrors() {
    if (!this.props.selectedLayer || !this.props.selectedLayer.hasErrors()) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          color="warning"
          title={i18n.translate('xpack.maps.layerPanel.settingsPanel.unableToLoadTitle', {
            defaultMessage: 'Unable to load layer',
          })}
        >
          <p data-test-subj="layerErrorMessage">{this.props.selectedLayer.getErrors()}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderFilterSection() {
    if (!this.props.selectedLayer || !this.props.selectedLayer.supportsElasticsearchFilters()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <FilterEditor />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderJoinSection() {
    if (!this.props.selectedLayer || !isVectorLayer(this.props.selectedLayer)) {
      return;
    }
    const vectorLayer = this.props.selectedLayer as IVectorLayer;
    if (!vectorLayer.showJoinEditor()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor
            layer={vectorLayer}
            leftJoinFields={this.state.leftJoinFields}
            layerDisplayName={this.state.displayName}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderSourceProperties() {
    return this.state.immutableSourceProps.map(
      ({ label, value, link }: ImmutableSourceProperty) => {
        function renderValue() {
          if (link) {
            return (
              <EuiLink href={link} target="_blank">
                {value}
              </EuiLink>
            );
          }
          return <span>{value}</span>;
        }
        return (
          <p key={label} className="mapLayerPanel__sourceDetail">
            <strong>{label}</strong> {renderValue()}
          </p>
        );
      }
    );
  }

  render() {
    if (!this.props.selectedLayer) {
      return null;
    }

    return (
      <KibanaContextProvider
        services={{
          appName: 'maps',
          storage: localStorage,
          data: getData(),
          ...getCore(),
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type={this.props.selectedLayer.getLayerTypeIconName()} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{this.state.displayName}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <div className="mapLayerPanel__sourceDetails">
              <EuiAccordion
                id="accordion1"
                buttonContent={i18n.translate('xpack.maps.layerPanel.sourceDetailsLabel', {
                  defaultMessage: 'Source details',
                })}
              >
                <EuiText color="subdued" size="s">
                  <EuiSpacer size="xs" />
                  {this._renderSourceProperties()}
                </EuiText>
              </EuiAccordion>
            </div>
          </EuiFlyoutHeader>

          <div className="mapLayerPanel__body">
            <div className="mapLayerPanel__bodyOverflow">
              {this._renderLayerErrors()}

              <LayerSettings
                layer={this.props.selectedLayer}
                supportsFitToBounds={this.state.supportsFitToBounds}
              />

              {this.props.selectedLayer.renderSourceSettingsEditor({
                clearJoins: this._clearJoins,
                currentLayerType: this.props.selectedLayer.getType(),
                hasJoins: isVectorLayer(this.props.selectedLayer)
                  ? (this.props.selectedLayer as IVectorLayer).hasJoins()
                  : false,
                onChange: this._onSourceChange,
              })}

              {this._renderFilterSection()}

              {this._renderJoinSection()}

              <StyleSettings />
            </div>
          </div>

          <EuiFlyoutFooter className="mapLayerPanel__footer">
            <FlyoutFooter />
          </EuiFlyoutFooter>
        </EuiFlexGroup>
      </KibanaContextProvider>
    );
  }
}
