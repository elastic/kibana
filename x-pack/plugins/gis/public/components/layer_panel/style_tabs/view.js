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

  constructor(props) {
    super();
    this.state = {
      tabSelected: '',
      currentStyle: props.layer
        && props.layer.getCurrentStyle()
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const currentStyle = nextProps.layer.getCurrentStyle();
    if (currentStyle) {
      if (!prevState.tabSelected) {
        return {
          tabSelected: currentStyle.constructor.getDisplayName(),
          currentStyle
        };
      } else {
        return {
          ...prevState,
          currentStyle
        };
      }
    } else {
      return {};
    }
  }

  _activateTab = tabName => {
    this.setState({ tabSelected: tabName });
  };


  render() {
    const { currentStyle, tabSelected } = this.state;
    if (!tabSelected) {
      return null;
    }
    const supportedStyles = this.props.layer.getSupportedStyles();
    const styleTabHeaders = supportedStyles.map((style, index) => {
      return (<StyleTab
        key={index}
        name={style.getDisplayName()}
        selected={tabSelected}
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
