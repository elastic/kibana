/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { OptionsMenu } from './options';

import {
  EuiWrappingPopover,
} from '@elastic/eui';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export function showOptionsPopover({
  anchorElement,
  darkTheme,
  onDarkThemeChange,
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <EuiWrappingPopover
      className="navbar__popover"
      id="popover"
      button={anchorElement}
      isOpen={true}
      closePopover={onClose}
    >
      <OptionsMenu
        darkTheme={darkTheme}
        onDarkThemeChange={onDarkThemeChange}
      />
    </EuiWrappingPopover>
  );
  ReactDOM.render(element, container);
}
