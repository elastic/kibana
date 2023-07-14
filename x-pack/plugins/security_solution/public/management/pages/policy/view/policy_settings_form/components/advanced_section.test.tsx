/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects, exactMatchText } from '../mocks';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import type { AdvancedSectionProps } from './advanced_section';
import { AdvancedSection } from './advanced_section';
import userEvent from '@testing-library/user-event';
import { AdvancedPolicySchema } from '../../../models/advanced_policy_schema';
import { within } from '@testing-library/dom';
import { set } from 'lodash';

jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Advanced Settings section', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').advancedSection;

  let formProps: AdvancedSectionProps;
  let render: (expanded?: boolean) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  const clickShowHideButton = () => {
    userEvent.click(renderResult.getByTestId(testSubj.showHideButton));
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.container,
    };

    render = (expanded = true) => {
      renderResult = mockedContext.render(<AdvancedSection {...formProps} />);

      if (expanded) {
        clickShowHideButton();
        expect(renderResult.getByTestId(testSubj.settingsContainer));
      }

      return renderResult;
    };
  });

  it('should render initially collapsed', () => {
    render(false);

    expect(renderResult.queryByTestId(testSubj.settingsContainer)).toBeNull();
  });

  it('should expand and collapse section when button is clicked', () => {
    render(false);

    expect(renderResult.queryByTestId(testSubj.settingsContainer)).toBeNull();

    clickShowHideButton();

    expect(renderResult.getByTestId(testSubj.settingsContainer));
  });

  it('should show warning callout', () => {
    const { getByTestId } = render(true);

    expect(getByTestId(testSubj.warningCallout));
  });

  it('should render all advanced options', () => {
    const fieldsWithDefaultValues = [
      'mac.advanced.capture_env_vars',
      'linux.advanced.capture_env_vars',
    ];

    render(true);

    for (const advancedOption of AdvancedPolicySchema) {
      const optionTestSubj = testSubj.settingRowTestSubjects(advancedOption.key);
      const renderedRow = within(renderResult.getByTestId(optionTestSubj.container));

      expect(renderedRow.getByTestId(optionTestSubj.textField));
      expect(renderedRow.getByTestId(optionTestSubj.label)).toHaveTextContent(
        exactMatchText(advancedOption.key)
      );
      expect(renderedRow.getByTestId(optionTestSubj.versionInfo)).toHaveTextContent(
        advancedOption.first_supported_version
      );

      if (advancedOption.last_supported_version) {
        expect(renderedRow.getByTestId(optionTestSubj.versionInfo)).toHaveTextContent(
          advancedOption.last_supported_version
        );
      }

      if (fieldsWithDefaultValues.includes(advancedOption.key)) {
        expect(renderedRow.getByTestId<HTMLInputElement>(optionTestSubj.textField).value).not.toBe(
          ''
        );
      } else {
        expect(renderedRow.getByTestId<HTMLInputElement>(optionTestSubj.textField).value).toBe('');
      }
    }
  });

  describe('and when license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should not render options that require platinum license', () => {
      render(true);

      for (const advancedOption of AdvancedPolicySchema) {
        if (advancedOption.license) {
          if (advancedOption.license === 'platinum') {
            expect(
              renderResult.queryByTestId(
                testSubj.settingRowTestSubjects(advancedOption.key).container
              )
            ).toBeNull();
          } else {
            throw new Error(
              `${advancedOption.key}: Unknown license value: ${advancedOption.license}`
            );
          }
        }
      }
    });
  });

  describe('and when rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render with no form fields', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.settingsContainer));
    });

    it('should render options in expected content', () => {
      const option1 = AdvancedPolicySchema[0];
      const option2 = AdvancedPolicySchema[4];

      set(formProps.policy, option1.key, 'foo');
      set(formProps.policy, option2.key, ''); // test empty value

      const { getByTestId } = render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.settingsContainer));
      expect(getByTestId(testSubj.settingRowTestSubjects(option1.key).container)).toHaveTextContent(
        exactMatchText('linux.advanced.agent.connection_delayInfo 7.9+foo')
      );
      expect(getByTestId(testSubj.settingRowTestSubjects(option2.key).container)).toHaveTextContent(
        exactMatchText('linux.advanced.artifacts.global.intervalInfo 7.9+—')
      );
    });
  });
});
