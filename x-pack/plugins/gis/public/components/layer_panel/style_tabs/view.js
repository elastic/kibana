/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiTabs,
  EuiTitle,
  EuiSpacer
} from '@elastic/eui';
import { StyleTab } from './resources/style_tab';

export class StyleTabs extends React.Component {

  constructor() {
    super();
    this.state = {
      tabSelected: ''
    };
  }

  _activateTab = tabName => {
    this.setState({ tabSelected: tabName });
  };


  render() {

    const currentStyle = this.props.layer.getCurrentStyle();
    if (currentStyle) {
      if (!this.state.tabSelected) {
        this.setState({
          tabSelected: currentStyle.constructor.getDisplayName()
        });
      }
    }
    if (!this.state.tabSelected) {
      return null;
    }
    const supportedStyles = this.props.layer.getSupportedStyles();
    const styleTabHeaders = supportedStyles.map((style, index) => {
      return (<StyleTab
        key={index}
        name={style.getDisplayName()}
        selected={this.state.tabSelected}
        onClick={this._activateTab}
      />);
    });

    const styleEditors = supportedStyles.map((style, index) => {

      const seedStyle = (style.canEdit(currentStyle)) ? currentStyle : null;
      const styleEditor = style.renderEditor({
        handleStyleChange: (styleDescriptor) => {
          this.props.updateStyle(styleDescriptor);
        },
        style: seedStyle,
        reset: () => this.props.reset()
      });

      return (
        <Fragment key={index}>
          {styleEditor}
        </Fragment>
      );
    });

    return (
      <div>
        <EuiTitle size="s"><h2><strong>Styling</strong></h2></EuiTitle>
        <Fragment>
          <EuiTabs>
            {styleTabHeaders}
          </EuiTabs>
          <EuiSpacer />
          {styleEditors}
        </Fragment>
      </div>
    );
  }
}
