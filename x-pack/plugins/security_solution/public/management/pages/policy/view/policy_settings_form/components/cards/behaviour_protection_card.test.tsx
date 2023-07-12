/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import type { BehaviourProtectionCardProps } from './behaviour_protection_card';
import { BehaviourProtectionCard, LOCKED_CARD_BEHAVIOR_TITLE } from './behaviour_protection_card';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Behaviour Protection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').behaviour;

  let formProps: BehaviourProtectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<BehaviourProtectionCard {...formProps} />));
  });

  it.todo('should render the card');

  it.todo('should show supported OS values');

  describe('and license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not platinum+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        LOCKED_CARD_BEHAVIOR_TITLE
      );
    });
  });

  describe('and displayed in View mode', () => {
    // FIXME:PT implement
  });
});
