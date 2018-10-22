/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiTitle,
  EuiPanel,
  EuiHorizontalRule
} from '@elastic/eui';

export class StyleTabs extends React.Component {

  constructor(props) {
    super();
    this.state = {
      currentStyle: props.layer && props.layer.getCurrentStyle()
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const currentStyle = nextProps.layer.getCurrentStyle();
    if (currentStyle) {
      return {
        ...prevState,
        currentStyle
      };
    } else {
      return {};
    }
  }

  render() {
    const { currentStyle } = this.state;
    const supportedStyles = this.props.layer.getSupportedStyles();

    const styleEditors = supportedStyles.map((style, index) => {
      const seedStyle = (style.canEdit(currentStyle)) ? currentStyle : null;

      const editorHeader = (
        <EuiTitle size="xs"><h5>{style.getDisplayName()}</h5></EuiTitle>
      );

      const styleEditor = this.props.layer.renderStyleEditor(style, {
        handleStyleChange: (styleDescriptor) => {
          this.props.updateStyle(styleDescriptor);
        },
        style: seedStyle,
        resetStyle: () => this.props.reset()
      });

      return (
        <EuiPanel key={index}>
          {editorHeader}
          <EuiHorizontalRule margin="m" />
          {styleEditor}
        </EuiPanel>
      );
    });

    return (
      <div>
        {styleEditors}
      </div>
    );
  }
}
