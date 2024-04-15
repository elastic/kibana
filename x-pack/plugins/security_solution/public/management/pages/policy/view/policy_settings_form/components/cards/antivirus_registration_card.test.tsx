/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AntivirusRegistrationCardProps } from './antivirus_registration_card';
import { LABEL, AntivirusRegistrationCard } from './antivirus_registration_card';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import userEvent from '@testing-library/user-event';
import { cloneDeep, set } from 'lodash';

describe('Policy Form Antivirus Registration Card', () => {
  const antivirusTestSubj = getPolicySettingsFormTestSubjects('test').antivirusRegistration;

  let formProps: AntivirusRegistrationCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

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
  });

  it('should render in edit mode', () => {
    render();

    expect(renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('should display for windows OS with restriction', () => {
    render();

    expect(renderResult.getByTestId(antivirusTestSubj.osValueContainer)).toHaveTextContent(
      'Windows RestrictionsInfo'
    );
  });

  it('should be able to enable the option', () => {
    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.antivirus_registration.enabled', true);

    render();

    expect(renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );

    userEvent.click(renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should be able to disable the option', async () => {
    set(formProps.policy, 'windows.antivirus_registration.enabled', true);

    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.antivirus_registration.enabled', false);

    render();

    expect(renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );

    userEvent.click(renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch));

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
      expect(renderResult.getByTestId(antivirusTestSubj.switchLabel)).toHaveTextContent(LABEL);
      expect(
        renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('false');
    });

    it('should render in view mode (option enabled)', () => {
      formProps.policy.windows.antivirus_registration.enabled = true;
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(renderResult.getByTestId(antivirusTestSubj.switchLabel)).toHaveTextContent(LABEL);
      expect(
        renderResult.getByTestId(antivirusTestSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
    });
  });
});
