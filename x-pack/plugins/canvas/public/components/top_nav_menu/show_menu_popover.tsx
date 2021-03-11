/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiWrappingPopover } from '@elastic/eui';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export function showMenuPopover({
  anchorElement,
  id,
  renderMenu,
}: {
  anchorElement: HTMLElement;
  id: string;
  renderMenu: (onClose: () => void) => JSX.Element;
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <EuiWrappingPopover
        id={id}
        button={anchorElement}
        isOpen={true}
        closePopover={onClose}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        {renderMenu(onClose)}
      </EuiWrappingPopover>
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
