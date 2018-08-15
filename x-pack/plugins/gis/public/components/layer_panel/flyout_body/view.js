/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiTabs,
  EuiTitle,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { ColorPicker } from './resources/color_picker';
import { StyleTab } from './resources/style_tab';

export function FlyoutBody(props) {
  return (
    <div>
      <EuiTitle size="s"><h2><strong>Styling</strong></h2></EuiTitle>
      <StyleContent {...props}/>
    </div>
  );
}

class StyleContent extends React.Component {

  constructor() {
    super();

    this.state = {
      tabSelected: ''
    };
  }

  _activateTab = tabName => {
    this.setState({ tabSelected: tabName });
  }

  _getStyleContent({ updateColor, currentLayerStyle, styleDescriptor }) {
    const currentColor = currentLayerStyle && currentLayerStyle.color || '#fff';
    this.state.tabSelected || this.setState({
      tabSelected: styleDescriptor.colorAdjustment.name });
    return (
      <Fragment>
        <EuiTabs>
          <StyleTab
            tabName={styleDescriptor.css.name}
            active={this.state.tabSelected === styleDescriptor.css.name}
            onClick={this._activateTab}
          />
          <StyleTab
            tabName={styleDescriptor.colorAdjustment.name}
            active={this.state.tabSelected === styleDescriptor.colorAdjustment.name}
            onClick={this._activateTab}
          />
        </EuiTabs>
        <EuiSpacer />
        <MapBoxCss
          active={this.state.tabSelected === styleDescriptor.css.name}
        />
        <ColorPicker
          changeColor={updateColor}
          currentColor={currentColor}
          active={this.state.tabSelected === styleDescriptor.colorAdjustment.name}
        />
      </Fragment>
    );
  }

  render() {
    return this._getStyleContent(this.props);
  }
}

function MapBoxCss({ active = true }) {
  return active && (
    <EuiTextArea />
  );
}
