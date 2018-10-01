/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { OptionsMenu } from './options_menu_container';

import { getStore } from '../../store/store';

import {
  EuiWrappingPopover,
} from '@elastic/eui';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export async function showOptionsPopover(anchorElement) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  const store = await getStore();

  document.body.appendChild(container);
  const element = (
    <Provider store={store}>
      <EuiWrappingPopover
        className="navbar__popover"
        id="popover"
        button={anchorElement}
        isOpen={true}
        closePopover={onClose}
      >
        <OptionsMenu/>
      </EuiWrappingPopover>
    </Provider>
  );
  ReactDOM.render(element, container);
}
