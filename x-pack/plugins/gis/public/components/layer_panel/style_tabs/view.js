/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiText
} from '@elastic/eui';

export function StyleTabs({ layer, reset, updateStyle }) {
  return layer.getSupportedStyles().map((Style, index) => {
    let description;
    if (Style.description) {
      description = (
        <EuiText size="s">
          <p>{Style.description}</p>
        </EuiText>
      );
    }

    const currentStyle = layer.getCurrentStyle();
    const styleEditor = layer.renderStyleEditor(Style, {
      handleStyleChange: (styleDescriptor) => {
        updateStyle(styleDescriptor);
      },
      style: (Style.canEdit(currentStyle)) ? currentStyle : null,
      resetStyle: () => reset()
    });

    return (
      <EuiPanel key={index}>
        <EuiTitle size="xs"><h5>{Style.getDisplayName()}</h5></EuiTitle>
        {description}
        <EuiSpacer margin="m"/>
        {styleEditor}
      </EuiPanel>
    );
  });
}
