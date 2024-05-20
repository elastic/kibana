/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import Router from 'react-router-dom';
import { paths } from '../../../common/locators/paths';
import { emptySloList, sloList } from '../../data/slo/slo';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useFetchSloGlobalDiagnosis } from '../../hooks/use_fetch_global_diagnosis';
import { useFetchSloList } from '../../hooks/use_fetch_slo_list';
import { useLicense } from '../../hooks/use_license';
import { useKibana } from '../../utils/kibana_react';
import { render } from '../../utils/test_helper';
import { SlosWelcomePage } from './slos_welcome';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_fetch_slo_list');
jest.mock('../../hooks/use_capabilities');
jest.mock('../../hooks/use_fetch_global_diagnosis');

const HeaderMenuPortalMock = HeaderMenuPortal as jest.Mock;
HeaderMenuPortalMock.mockReturnValue(<div>Portal node</div>);

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;
const useGlobalDiagnosisMock = useFetchSloGlobalDiagnosis as jest.Mock;

const mockNavigate = jest.fn();

const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      theme: {},
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
      observabilityAIAssistant: mockObservabilityAIAssistant,
    },
  });
};

describe('SLOs Welcome Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useCapabilitiesMock.mockReturnValue({ hasWriteCapabilities: true, hasReadCapabilities: true });
    jest
      .spyOn(Router, 'useLocation')
      .mockReturnValue({ pathname: '/slos/welcome', search: '', state: '', hash: '' });
  });

  describe('when the incorrect license is found', () => {
    it('renders the welcome message with subscription buttons', async () => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, data: emptySloList });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: { write: { has_all_requested: true }, read: { has_all_requested: true } },
        },
      });

      render(<SlosWelcomePage />);

      expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();
      expect(screen.queryByTestId('slosPageWelcomePromptSignupForCloudButton')).toBeTruthy();
      expect(screen.queryByTestId('slosPageWelcomePromptSignupForLicenseButton')).toBeTruthy();
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
      useGlobalDiagnosisMock.mockReturnValue({
        isError: false,
      });
    });

    describe('when loading is done and no results are found', () => {
      beforeEach(() => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, data: emptySloList });
      });

      it('disables the create slo button when no write capabilities', async () => {
        useCapabilitiesMock.mockReturnValue({
          hasWriteCapabilities: false,
          hasReadCapabilities: true,
        });

        render(<SlosWelcomePage />);

        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');

        expect(createNewSloButton).toBeDisabled();
      });

      it('disables the create slo button when no cluster permissions capabilities', async () => {
        useCapabilitiesMock.mockReturnValue({
          hasWriteCapabilities: true,
          hasReadCapabilities: true,
        });
        useGlobalDiagnosisMock.mockReturnValue({
          data: {
            userPrivileges: {
              write: { has_all_requested: false },
              read: { has_all_requested: true },
            },
          },
        });

        render(<SlosWelcomePage />);
        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeDisabled();
      });

      it('should display the welcome message with a Create new SLO button which should navigate to the SLO Creation page', async () => {
        useGlobalDiagnosisMock.mockReturnValue({
          data: {
            userPrivileges: {
              write: { has_all_requested: true },
              read: { has_all_requested: true },
            },
          },
        });

        render(<SlosWelcomePage />);
        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeTruthy();
        createNewSloButton?.click();

        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(paths.sloCreate);
        });
      });
    });

    describe('when loading is done and results are found', () => {
      beforeEach(() => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, data: sloList });
        useGlobalDiagnosisMock.mockReturnValue({
          data: {
            userPrivileges: {
              write: { has_all_requested: true },
              read: { has_all_requested: true },
            },
          },
        });
      });

      it('should navigate to the SLO List page', async () => {
        render(<SlosWelcomePage />);
        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(paths.slos);
        });
      });
    });
  });
});
