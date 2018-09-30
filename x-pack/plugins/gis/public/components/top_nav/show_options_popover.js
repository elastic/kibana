/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { OptionsMenu } from './options_menu';

import { getStore } from '../../store/store';
import { getIsDarkTheme, updateIsDarkTheme } from '../../store/ui';

import {
  EuiWrappingPopover,
} from '@elastic/eui';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export async function showOptionsPopover({
  anchorElement,
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  // TODO figure out how to use connect to avoid having to manually wire state and dispatch functions
  const store = await getStore();

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
        darkTheme={getIsDarkTheme(store.getState())}
        onDarkThemeChange={(isDarkTheme) => {
          store.dispatch(updateIsDarkTheme(isDarkTheme));
        }}
      />
    </EuiWrappingPopover>
  );
  ReactDOM.render(element, container);
}
