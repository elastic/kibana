/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiHeaderSectionItemButton,
} from '@elastic/eui';
import React, { Component } from 'react';
import { ButtonProps } from '../types';

export class SpacesHeaderNavButton extends Component<ButtonProps> {
  public render() {
    const { spaceSelectorShown, linkTitle, linkIcon, toggleSpaceSelector } = this.props;
    return (
      <EuiHeaderSectionItemButton
        aria-controls="headerSpacesMenuList"
        aria-expanded={spaceSelectorShown}
        aria-haspopup="true"
        aria-label={linkTitle}
        title={linkTitle}
        onClick={toggleSpaceSelector}
      >
        {linkIcon}
      </EuiHeaderSectionItemButton>
    );
  }
}
