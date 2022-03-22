/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreTheme } from 'kibana/public';
import { EuiPopoverTitle, EuiSwitch, EuiWrappingPopover } from '@elastic/eui';
import { Observable } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';

const container = document.createElement('div');
let isOpen = false;

function closeSettingsMenu() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function toggleSettingsMenuOpen({
  autoApplyEnabled,
  toggleAutoApply,
  anchorElement,
  theme$,
}: {
  autoApplyEnabled: boolean;
  toggleAutoApply: () => void;
  anchorElement: HTMLElement;
  theme$: Observable<CoreTheme>;
}) {
  if (isOpen) {
    closeSettingsMenu();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaThemeProvider theme$={theme$}>
      <I18nProvider>
        <EuiWrappingPopover ownFocus button={anchorElement} closePopover={closeSettingsMenu} isOpen>
          <EuiPopoverTitle>Lens settings</EuiPopoverTitle>
          <EuiSwitch
            label="Auto-apply visualization changes"
            checked={autoApplyEnabled}
            onChange={() => toggleAutoApply()}
          />
        </EuiWrappingPopover>
      </I18nProvider>
    </KibanaThemeProvider>
  );
  ReactDOM.render(element, container);
}
