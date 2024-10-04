/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AntivirusRegistrationCardProps } from './antivirus_registration_card';
import { AntivirusRegistrationCard } from './antivirus_registration_card';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import { AntivirusRegistrationModes } from '../../../../../../../../common/endpoint/types';

describe('Policy Form Antivirus Registration Card', () => {
  const antivirusTestSubj = getPolicySettingsFormTestSubjects('test').antivirusRegistration;

  let formProps: AntivirusRegistrationCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let getRadioButton: (testSubject: string) => HTMLInputElement;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': antivirusTestSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<AntivirusRegistrationCard {...formProps} />));

    getRadioButton = (testSubject) => renderResult.getByTestId(testSubject).querySelector('input')!;
  });

  it('should render in edit mode with default value selected', () => {
    render();

    expect(renderResult.getByTestId(antivirusTestSubj.radioButtons)).toBeTruthy();

    expect(getRadioButton(antivirusTestSubj.disabledRadioButton)).not.toHaveAttribute('disabled');
    expect(getRadioButton(antivirusTestSubj.enabledRadioButton)).not.toHaveAttribute('disabled');
    expect(getRadioButton(antivirusTestSubj.syncRadioButton)).not.toHaveAttribute('disabled');

    expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(true);
  });

  it('should check `disabled` radio button if `antivirus_registration.mode` is disabled', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;

    render();

    expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(true);
    expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(false);
  });

  it('should check `enabled` radio button if `antivirus_registration.mode` is enabled', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    render();

    expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(true);
    expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(false);
  });

  it('should check `sync` radio button if `antivirus_registration.mode` is sync', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;

    render();

    expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(false);
    expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(true);
  });

  it('should display for windows OS with restriction', () => {
    render();

    expect(renderResult.getByTestId(antivirusTestSubj.osValueContainer)).toHaveTextContent(
      'Windows RestrictionsInfo'
    );
  });

  it('should be able to enable the option', async () => {
    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    render();

    await userEvent.click(getRadioButton(antivirusTestSubj.enabledRadioButton));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should be able to disable the option', async () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;

    render();

    await userEvent.click(getRadioButton(antivirusTestSubj.disabledRadioButton));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should be able to set to sync with malware', async () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;

    render();

    await userEvent.click(getRadioButton(antivirusTestSubj.syncRadioButton));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  describe('And rendered in View only mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render in view mode (option disabled)', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
      expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(false);
      expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(true);
    });

    it('should render in view mode (option enabled)', () => {
      formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
      expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(true);
      expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(false);
    });

    it('should render in view mode (option sync)', () => {
      formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(getRadioButton(antivirusTestSubj.disabledRadioButton).checked).toBe(false);
      expect(getRadioButton(antivirusTestSubj.enabledRadioButton).checked).toBe(false);
      expect(getRadioButton(antivirusTestSubj.syncRadioButton).checked).toBe(true);
    });
  });
});
