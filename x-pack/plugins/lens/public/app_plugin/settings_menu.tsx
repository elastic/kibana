/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreTheme } from '@kbn/core/public';
import { EuiPopoverTitle, EuiSwitch, EuiWrappingPopover } from '@elastic/eui';
import { Observable } from 'rxjs';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Store } from 'redux';
import { Provider } from 'react-redux';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  disableAutoApply,
  enableAutoApply,
  LensAppState,
  selectAutoApplyEnabled,
  useLensDispatch,
  useLensSelector,
} from '../state_management';
import { writeToStorage } from '../settings_storage';
import { AUTO_APPLY_DISABLED_STORAGE_KEY } from '../editor_frame_service/editor_frame/workspace_panel/workspace_panel_wrapper';

const container = document.createElement('div');
let isMenuOpen = false;

// exported for testing purposes only
export function SettingsMenu({
  anchorElement,
  isOpen,
  onClose,
}: {
  anchorElement: HTMLElement;
  isOpen: boolean;
  onClose: () => void;
}) {
  const autoApplyEnabled = useLensSelector(selectAutoApplyEnabled);

  const dispatch = useLensDispatch();

  const toggleAutoApply = useCallback(() => {
    onClose();
    writeToStorage(
      new Storage(localStorage),
      AUTO_APPLY_DISABLED_STORAGE_KEY,
      String(autoApplyEnabled)
    );
    dispatch(autoApplyEnabled ? disableAutoApply() : enableAutoApply());
  }, [dispatch, autoApplyEnabled, onClose]);

  return (
    <EuiWrappingPopover
      data-test-subj="lnsApp__settingsMenu"
      ownFocus
      button={anchorElement}
      closePopover={onClose}
      isOpen
    >
      <EuiPopoverTitle>
        <FormattedMessage id="xpack.lens.settings.title" defaultMessage="Lens settings" />
      </EuiPopoverTitle>
      <EuiSwitch
        label={i18n.translate('xpack.lens.settings.autoApply', {
          defaultMessage: 'Auto-apply visualization changes',
        })}
        checked={autoApplyEnabled}
        onChange={() => toggleAutoApply()}
        data-test-subj="lnsToggleAutoApply"
      />
    </EuiWrappingPopover>
  );
}

/**
 * Toggles the settings menu
 *
 * Note: the code inside this function is covered only at the functional test level
 */
export function toggleSettingsMenuOpen(props: {
  lensStore: Store<LensAppState>;
  anchorElement: HTMLElement;
  theme$: Observable<CoreTheme>;
}) {
  const root = createRoot(container);

  function closeSettingsMenu() {
    root.unmount();
    document.body.removeChild(container);
    isMenuOpen = false;
  }

  if (isMenuOpen) {
    closeSettingsMenu();
    return;
  }

  isMenuOpen = true;
  document.body.appendChild(container);

  const element = (
    <Provider store={props.lensStore}>
      <KibanaThemeProvider theme$={props.theme$}>
        <I18nProvider>
          <SettingsMenu {...props} isOpen={isMenuOpen} onClose={closeSettingsMenu} />
        </I18nProvider>
      </KibanaThemeProvider>
    </Provider>
  );
  root.render(element);
}
