/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { set } from 'lodash';
import { ProtectionModes } from '../../../../../../../../common/endpoint/types';
import type { BehaviourProtectionCardProps } from './protection_seetings_card/behaviour_protection_card';
import {
  BehaviourProtectionCard,
  LOCKED_CARD_BEHAVIOR_TITLE,
} from './protection_seetings_card/behaviour_protection_card';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Behaviour Protection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').behaviour;

  let formProps: BehaviourProtectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let startServices: AppContextTestRender['startServices'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    startServices = mockedContext.startServices;

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

  it('should render the card with expected components', () => {
    const { getByTestId, queryByTestId } = render();

    expect(getByTestId(testSubj.enableDisableSwitch));
    expect(getByTestId(testSubj.protectionPreventRadio));
    expect(getByTestId(testSubj.notifyUserCheckbox));
    expect(queryByTestId(testSubj.reputationServiceCheckbox)).not.toBeInTheDocument();
  });

  it('should show reputation service section for cloud user', () => {
    startServices.cloud!.isCloudEnabled = true;
    const { getByTestId } = render();

    expect(getByTestId(testSubj.reputationServiceCheckbox));
  });

  it('should show supported OS values', () => {
    const { getByTestId } = render();

    expect(getByTestId(testSubj.osValuesContainer)).toHaveTextContent('Windows, Mac, Linux');
  });

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
    const cardTextContent = (
      args: {
        enabled?: boolean;
        reputationServices?: boolean;
        notifyUser?: boolean;
        prebuiltRules?: boolean;
      } = {}
    ) => {
      const defaults = {
        enabled: true,
        reputationServices: false,
        notifyUser: true,
        prebuiltRules: false,
      };
      const config = { ...defaults, ...args };

      const baseText = [
        'Type',
        'Malicious behavior',
        'Operating system',
        'Windows, Mac, Linux ',
        `Malicious behavior protections ${config.enabled ? 'enabled' : 'disabled'}`,
      ];

      return (
        config.enabled
          ? [
              ...baseText,
              'Protection level',
              'Prevent',
              ...(config.reputationServices
                ? ['Reputation serviceInfo', "Don't use reputation service"]
                : []),
              'User notification',
              'Agent version 7.15+',
              ...(config.notifyUser
                ? ['Notify user', 'Notification message', '—']
                : ['Notify user']),
            ]
          : baseText
      ).join('');
    };

    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should display correctly when overall card is enabled', () => {
      const { getByTestId } = render();
      expectIsViewOnly(getByTestId(testSubj.card));
      expect(getByTestId(testSubj.card)).toHaveTextContent(cardTextContent());
    });

    it('should display correctly when overall card is enabled for cloud user', () => {
      startServices.cloud!.isCloudEnabled = true;
      const { getByTestId } = render();
      expectIsViewOnly(getByTestId(testSubj.card));
      expect(getByTestId(testSubj.card)).toHaveTextContent(
        cardTextContent({ reputationServices: true })
      );
    });

    it('should display correctly when overall card is disabled', () => {
      set(formProps.policy, 'windows.behavior_protection.mode', ProtectionModes.off);
      const { getByTestId } = render();
      expectIsViewOnly(getByTestId(testSubj.card));
      expect(getByTestId(testSubj.card)).toHaveTextContent(
        cardTextContent({ enabled: false, prebuiltRules: true })
      );
    });

    it('should display correctly when overall card is disabled for cloud user', () => {
      startServices.cloud!.isCloudEnabled = true;
      set(formProps.policy, 'windows.behavior_protection.mode', ProtectionModes.off);
      const { getByTestId } = render();
      expectIsViewOnly(getByTestId(testSubj.card));
      expect(getByTestId(testSubj.card)).toHaveTextContent(
        cardTextContent({
          enabled: false,
          reputationServices: true,
          prebuiltRules: true,
        })
      );
    });

    it('should display user notification disabled', () => {
      set(formProps.policy, 'windows.popup.behavior_protection.enabled', false);
      const { getByTestId } = render();
      expectIsViewOnly(getByTestId(testSubj.card));
      expect(getByTestId(testSubj.card)).toHaveTextContent(cardTextContent({ notifyUser: false }));
    });
  });
});
