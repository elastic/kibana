/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { StyleTabs } from './style_tabs';
import { JoinEditor } from './join_editor';
import { FlyoutFooter } from './flyout_footer';
import { SettingsPanel } from './settings_panel';

import {
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiLink,
} from '@elastic/eui';

export class LayerPanel  extends React.Component {

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextId = nextProps.selectedLayer.getId();
    if (nextId !== prevState.prevId) {
      return {
        isLayerAsyncStateLoaded: false,
        displayName: '',
        immutableSourceProps: [],
        prevId: nextId,
      };
    }

    return null;
  }

  state = {}

  componentDidMount() {
    this._isMounted = true;
    this.loadDisplayName();
    this.loadImmutableSourceProperties();
  }

  componentDidUpdate() {
    if (!this.state.isLayerAsyncStateLoaded) {
      this.setState({
        isLayerAsyncStateLoaded: true
      },
      () => {
        this.loadDisplayName();
        this.loadImmutableSourceProperties();
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  loadDisplayName = async () => {
    const displayName = await this.props.selectedLayer.getDisplayName();
    if (this._isMounted) {
      this.setState({ displayName });
    }
  }

  loadImmutableSourceProperties = async () => {
    const immutableSourceProps = await this.props.selectedLayer.getImmutableSourceProperties();
    if (this._isMounted) {
      this.setState({ immutableSourceProps });
    }
  }

  _renderJoinSection() {
    if (!this.props.selectedLayer.isJoinable()) {
      return null;
    }

    return (
      <Fragment>
        <EuiPanel>
          <JoinEditor/>
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  _renderSourceProperties() {
    return this.state.immutableSourceProps.map(({ label, value, link }) => {
      function renderValue() {
        if (link) {
          return (<EuiLink href={link} target="_blank">{value}</EuiLink>);
        }
        return (<span>{value}</span>);
      }
      return (
        <p key={label}>
          <strong className="gisLayerDetails__label">{label}</strong>
          {renderValue()}
        </p>
      );
    });
  }

  render() {
    const { selectedLayer } = this.props;

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
      >
        <EuiFlyoutHeader hasBorder className="gisLayerPanel__header">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              {selectedLayer.getIcon()}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>{this.state.displayName}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiAccordion
            id="accordion1"
            buttonContent="Source details"
          >
            <EuiText color="subdued" size="s">
              <div className="gisLayerDetails">
                {this._renderSourceProperties()}
              </div>
            </EuiText>
          </EuiAccordion>
        </EuiFlyoutHeader>

        <EuiFlyoutBody className="gisLayerPanel__body">
          <SettingsPanel/>
          <EuiSpacer size="s" />
          {this._renderJoinSection()}
          <StyleTabs layer={selectedLayer}/>
        </EuiFlyoutBody>

        <EuiFlyoutFooter className="gisLayerPanel__footer">
          <FlyoutFooter/>
        </EuiFlyoutFooter>
      </EuiFlexGroup>
    );
  }
}
