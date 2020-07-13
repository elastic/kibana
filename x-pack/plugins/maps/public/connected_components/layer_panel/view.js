/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FilterEditor } from './filter_editor';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { LayerErrors } from './layer_errors';
import { LayerSettings } from './layer_settings';
import { StyleSettings } from './style_settings';
import {
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
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

import { getData, getCore } from '../../kibana_services';

const localStorage = new Storage(window.localStorage);

export class LayerPanel extends React.Component {
  state = {
    displayName: '',
    immutableSourceProps: [],
    leftJoinFields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadDisplayName();
    this._loadImmutableSourceProperties();
    this._loadLeftJoinFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

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
    if (!this.props.selectedLayer || !this.props.selectedLayer.isJoinable()) {
      return;
    }

    let leftJoinFields;
    try {
      const leftFieldsInstances = await this.props.selectedLayer.getLeftJoinFields();
      const leftFieldPromises = leftFieldsInstances.map(async (field) => {
        return {
          name: field.getName(),
          label: await field.getLabel(),
        };
      });
      leftJoinFields = await Promise.all(leftFieldPromises);
    } catch (error) {
      leftJoinFields = [];
    }
    if (this._isMounted) {
      this.setState({ leftJoinFields });
    }
  }

  _onSourceChange = (...args) => {
    for (let i = 0; i < args.length; i++) {
      const { propName, value, newLayerType } = args[i];
      this.props.updateSourceProp(this.props.selectedLayer.getId(), propName, value, newLayerType);
    }
  };

  _renderFilterSection() {
    if (!this.props.selectedLayer.supportsElasticsearchFilters()) {
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
    if (!this.props.selectedLayer.isJoinable()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor
            leftJoinFields={this.state.leftJoinFields}
            layerDisplayName={this.state.displayName}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderSourceProperties() {
    return this.state.immutableSourceProps.map(({ label, value, link }) => {
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
    });
  }

  render() {
    const { selectedLayer } = this.props;

    if (!selectedLayer) {
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
                <EuiIcon type={selectedLayer.getLayerTypeIconName()} />
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
              <LayerErrors />

              <LayerSettings layer={selectedLayer} />

              {this.props.selectedLayer.renderSourceSettingsEditor({
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
