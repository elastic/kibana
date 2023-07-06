/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { useFetchSloGlobalDiagnosis } from '../../hooks/slo/use_fetch_global_diagnosis';
import { useLicense } from '../../hooks/use_license';
import { SlosWelcomePage } from './slos_welcome';
import { emptySloList, sloList } from '../../data/slo/slo';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { paths } from '../../routes/paths';

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/slo/use_fetch_slo_list');
jest.mock('../../hooks/slo/use_capabilities');
jest.mock('../../hooks/slo/use_fetch_global_diagnosis');

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;
const useGlobalDiagnosisMock = useFetchSloGlobalDiagnosis as jest.Mock;

const mockNavigate = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
    },
  });
};

describe('SLOs Welcome Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useCapabilitiesMock.mockReturnValue({ hasWriteCapabilities: true, hasReadCapabilities: true });
  });

  describe('when the incorrect license is found', () => {
    it('renders the welcome message with subscription buttons', async () => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, sloList: emptySloList });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useGlobalDiagnosisMock.mockReturnValue({
        isError: false,
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
        useFetchSloListMock.mockReturnValue({ isLoading: false, emptySloList });
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
          isError: true,
        });

        render(<SlosWelcomePage />);
        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeDisabled();
      });

      it('should display the welcome message with a Create new SLO button which should navigate to the SLO Creation page', async () => {
        useGlobalDiagnosisMock.mockReturnValue({
          isError: false,
        });

        render(<SlosWelcomePage />);
        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeTruthy();
        createNewSloButton?.click();

        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(paths.observability.sloCreate);
        });
      });
    });

    describe('when loading is done and results are found', () => {
      beforeEach(() => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });
        useGlobalDiagnosisMock.mockReturnValue({
          isError: false,
        });
      });

      it('should navigate to the SLO List page', async () => {
        render(<SlosWelcomePage />);
        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(paths.observability.slos);
        });
      });
    });
  });
});
