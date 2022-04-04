/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch, EuiSwitchEvent, EuiWrappingPopover } from '@elastic/eui';
import { getMountWithProviderParams } from '../mocks';
import { SettingsMenu } from './settings_menu';
import { selectAutoApplyEnabled } from '../state_management';
import { mount, ReactWrapper } from 'enzyme';
import { EnhancedStore } from '@reduxjs/toolkit';
import { I18nProvider } from '@kbn/i18n-react';

class Harness {
  private _instance: ReactWrapper;

  constructor(instance: ReactWrapper) {
    this._instance = instance;
  }

  triggerClose() {
    this._instance.find(EuiWrappingPopover).props().closePopover();
  }

  private get autoApplySwitch() {
    return this._instance.find(EuiSwitch);
  }

  public toggleAutoApply() {
    this.autoApplySwitch.props().onChange({} as EuiSwitchEvent);
    this._instance.update();
  }

  public get autoApplyEnabled() {
    return this.autoApplySwitch.props().checked;
  }
}

describe('settings menu', () => {
  const anchorButton = document.createElement('button');
  let onCloseMock: jest.Mock;
  let instance: ReactWrapper;
  let harness: Harness;
  let lensStore: EnhancedStore;

  beforeEach(() => {
    onCloseMock = jest.fn();

    // not using mountWithProvider since it wraps the mount call in ReactTestUtils.act
    // which causes the EuiPopover to close
    const { mountArgs, lensStore: _lensStore } = getMountWithProviderParams(
      <I18nProvider>
        <SettingsMenu anchorElement={anchorButton} isOpen onClose={onCloseMock} />
      </I18nProvider>
    );

    lensStore = _lensStore;
    instance = mount(mountArgs.component, mountArgs.options);
    harness = new Harness(instance);
  });

  it('should call onClose when popover closes', async () => {
    harness.triggerClose();
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should toggle auto-apply', async () => {
    const enabledInState = () => selectAutoApplyEnabled(lensStore.getState());

    expect(harness.autoApplyEnabled).toBeTruthy();
    expect(enabledInState()).toBeTruthy();

    harness.toggleAutoApply();

    expect(harness.autoApplyEnabled).toBeFalsy();
    expect(enabledInState()).toBeFalsy();

    harness.toggleAutoApply();

    expect(harness.autoApplyEnabled).toBeTruthy();
    expect(enabledInState()).toBeTruthy();
  });
});
