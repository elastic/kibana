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
    const { mapboxCss, vectorAdjustment } = styleDescriptor;
    const currentColor = currentLayerStyle && currentLayerStyle.color || '#fff';
    vectorAdjustment && !this.state.tabSelected && this.setState({
      tabSelected: vectorAdjustment.name });
    if (!this.state.tabSelected) { return null; }
    return (
      <Fragment>
        <EuiTabs>
          <StyleTab
            name={mapboxCss && mapboxCss.name}
            selected={this.state.tabSelected}
            onClick={this._activateTab}
          />
          <StyleTab
            name={vectorAdjustment && vectorAdjustment.name}
            selected={this.state.tabSelected}
            onClick={this._activateTab}
          />
        </EuiTabs>
        <EuiSpacer />
        <MapBoxCss
          tabName={mapboxCss && mapboxCss.name}
          selected={this.state.tabSelected}
        />
        <ColorPicker
          tabName={vectorAdjustment && vectorAdjustment.name}
          changeColor={updateColor}
          currentColor={currentColor}
          selected={this.state.tabSelected}
        />
      </Fragment>
    );
  }

  render() {
    return this._getStyleContent(this.props);
  }
}

// Placeholder component
function MapBoxCss({ selected, tabName }) {
  return selected === tabName && (
    <EuiTextArea /> || null
  );
}
