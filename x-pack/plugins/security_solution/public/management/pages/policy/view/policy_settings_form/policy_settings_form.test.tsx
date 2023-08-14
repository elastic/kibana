/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from './mocks';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import type { PolicySettingsFormProps } from './policy_settings_form';
import { PolicySettingsForm } from './policy_settings_form';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { UpsellingService } from '../../../../../common/lib/upsellings';

jest.mock('../../../../../common/hooks/use_license');

describe('Endpoint Policy Settings Form', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test');

  let formProps: PolicySettingsFormProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let upsellingService: UpsellingService;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    upsellingService = mockedContext.startServices.upselling;

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
    };

    render = () => (renderResult = mockedContext.render(<PolicySettingsForm {...formProps} />));
  });

  it.each([
    ['malware', testSubj.malware.card],
    ['ransomware', testSubj.ransomware.card],
    ['memory', testSubj.memory.card],
    ['behaviour', testSubj.behaviour.card],
    ['attack surface', testSubj.attackSurface.card],
    ['windows events', testSubj.windowsEvents.card],
    ['mac events', testSubj.macEvents.card],
    ['linux events', testSubj.linuxEvents.card],
    ['antivirus registration', testSubj.antivirusRegistration.card],
    ['advanced settings', testSubj.advancedSection.container],
  ])('should include %s card', (_, testSubjSelector) => {
    render();

    expect(renderResult.getByTestId(testSubjSelector));
  });

  it('should render in View mode', () => {
    formProps.mode = 'view';
    render();

    expectIsViewOnly(renderResult.getByTestId('test'));
  });

  describe('and when policy protections are not available', () => {
    beforeEach(() => {
      upsellingService.setSections({
        endpointPolicyProtections: () => <div data-test-subj="paywall">{'pay up!'}</div>,
      });
    });

    it.each([
      ['malware', testSubj.malware.card],
      ['ransomware', testSubj.ransomware.card],
      ['memory', testSubj.memory.card],
      ['behaviour', testSubj.behaviour.card],
      ['attack surface', testSubj.attackSurface.card],
      ['antivirus registration', testSubj.antivirusRegistration.card],
    ])('should include %s card', (_, testSubjSelector) => {
      render();

      expect(renderResult.queryByTestId(testSubjSelector)).toBeNull();
    });

    it('should display upselling component', () => {
      render();
      expect(renderResult.getByTestId('paywall'));
    });
  });
});
