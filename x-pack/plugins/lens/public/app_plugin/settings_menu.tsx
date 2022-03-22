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
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';

const container = document.createElement('div');
let isOpen = false;

function SettingsMenu({
  autoApplyEnabled,
  toggleAutoApply,
  anchorElement,
  onClose,
}: {
  autoApplyEnabled: boolean;
  toggleAutoApply: () => void;
  anchorElement: HTMLElement;
  onClose: () => void;
}) {
  return (
    <EuiWrappingPopover ownFocus button={anchorElement} closePopover={onClose} isOpen>
      <EuiPopoverTitle>
        <FormattedMessage id="x-pack.lens.settings.title" defaultMessage="Lens settings" />
      </EuiPopoverTitle>
      <EuiSwitch
        label={i18n.translate('x-pack.lens.settings.autoApply', {
          defaultMessage: 'Auto-apply visualization changes',
        })}
        checked={autoApplyEnabled}
        onChange={() => toggleAutoApply()}
      />
    </EuiWrappingPopover>
  );
}

function closeSettingsMenu() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function toggleSettingsMenuOpen(props: {
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
    <KibanaThemeProvider theme$={props.theme$}>
      <I18nProvider>
        <SettingsMenu {...props} onClose={closeSettingsMenu} />
      </I18nProvider>
    </KibanaThemeProvider>
  );
  ReactDOM.render(element, container);
}
