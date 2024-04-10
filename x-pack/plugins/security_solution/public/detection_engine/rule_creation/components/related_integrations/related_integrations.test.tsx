/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  screen,
  render,
  act,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import { FIELD_TYPES, Form, useForm } from '../../../../shared_imports';
import { createReactQueryWrapper } from '../../../../common/mock';
import { fleetIntegrationsApi } from '../../../fleet_integrations/api/__mocks__';
import { RelatedIntegrations } from './related_integrations';

// must match to the import in rules/related_integrations/use_integrations.tsx
jest.mock('../../../fleet_integrations/api');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      docLinks: {
        links: {},
      },
    },
  }),
}));

const RELATED_INTEGRATION_ROW = 'relatedIntegrationRow';
const COMBO_BOX_TOGGLE_BUTTON_TEST_ID = 'comboBoxToggleListButton';
const COMBO_BOX_SELECTION_TEST_ID = 'euiComboBoxPill';
const COMBO_BOX_CLEAR_BUTTON_TEST_ID = 'comboBoxClearButton';
const VERSION_INPUT_TEST_ID = 'relatedIntegrationVersionDependency';
const REMOVE_INTEGRATION_ROW_BUTTON_TEST_ID = 'relatedIntegrationRemove';

describe('RelatedIntegrations form part', () => {
  beforeEach(() => {
    fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
      integrations: [
        {
          package_name: 'package-a',
          package_title: 'Package A',
          latest_package_version: '1.0.0',
          is_installed: false,
          is_enabled: false,
        },
      ],
    });
  });

  it('renders related integrations label pointing to fields', () => {
    render(<TestForm />);

    expect(screen.getByLabelText('Related integrations')).toBeDefined();
  });

  describe('visual representation', () => {
    it('shows package title when integration title is not set', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });

      expect(screen.getByTestId(COMBO_BOX_SELECTION_TEST_ID)).toHaveTextContent('Package A');
    });

    it('shows integration title when package and integration titles are set', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            integration_name: 'integration-a',
            integration_title: 'Integration A',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });

      expect(screen.getByTestId(COMBO_BOX_SELECTION_TEST_ID)).toHaveTextContent('Integration A');
    });

    it.each([
      [
        'Not installed',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          latest_package_version: '1.2.0',
          is_installed: false,
          is_enabled: false,
        },
      ],
      [
        'Installed: Disabled',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          installed_package_version: '1.2.0',
          latest_package_version: '1.2.0',
          is_installed: true,
          is_enabled: false,
        },
      ],
      [
        'Installed: Enabled',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          installed_package_version: '1.2.0',
          latest_package_version: '1.2.0',
          is_installed: true,
          is_enabled: true,
        },
      ],
    ])('shows integration status "%s" in combo box popover', async (status, integrationData) => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [integrationData],
      });

      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await showEuiComboBoxOptions(screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID));

      expect(screen.getByRole('option')).toHaveTextContent(status);
    });

    it.each([
      [
        'Package A',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          latest_package_version: '1.2.0',
          is_installed: false,
          is_enabled: false,
        },
      ],
      [
        'Package A: Disabled',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          installed_package_version: '1.2.0',
          latest_package_version: '1.2.0',
          is_installed: true,
          is_enabled: false,
        },
      ],
      [
        'Package A: Enabled',
        {
          package_name: 'package-a',
          package_title: 'Package A',
          installed_package_version: '1.2.0',
          latest_package_version: '1.2.0',
          is_installed: true,
          is_enabled: true,
        },
      ],
    ])(
      'shows integration name with its status "%s" when selected in combo box',
      async (nameWithStatus, integrationData) => {
        fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
          integrations: [integrationData],
        });

        render(<TestForm />, { wrapper: createReactQueryWrapper() });

        await addRelatedIntegrationRow();
        await selectFirstEuiComboBoxOption({
          comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
        });

        expect(screen.getByTestId(COMBO_BOX_SELECTION_TEST_ID)).toHaveTextContent(
          new RegExp(`^${nameWithStatus}$`)
        );
      }
    );

    it('shows integration version range corresponding to the latest package version when integration is NOT installed', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });

      expect(screen.getByTestId(VERSION_INPUT_TEST_ID)).toHaveValue('^1.2.0');
    });

    it('shows integration version range corresponding to the installed package version when integration is installed', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            installed_package_version: '1.1.0',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });

      expect(screen.getByTestId(VERSION_INPUT_TEST_ID)).toHaveValue('^1.1.0');
    });

    it('shows saved earlier related integrations', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.0.0',
            is_installed: false,
            is_enabled: false,
          },
          {
            package_name: 'package-b',
            package_title: 'Package B',
            integration_name: 'integration-a',
            integration_title: 'Integration A',
            latest_package_version: '1.0.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '1.2.3' },
        { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
      ];

      render(<TestForm initialState={initialRelatedIntegrations} />, {
        wrapper: createReactQueryWrapper(),
      });

      await waitForIntegrationsToBeLoaded();

      const visibleIntegrations = screen.getAllByTestId(COMBO_BOX_SELECTION_TEST_ID);
      const visibleVersionInputs = screen.getAllByTestId(VERSION_INPUT_TEST_ID);

      expect(visibleIntegrations[0]).toHaveTextContent('Package A');
      expect(visibleVersionInputs[0]).toHaveValue('1.2.3');

      expect(visibleIntegrations[1]).toHaveTextContent('Integration A');
      expect(visibleVersionInputs[1]).toHaveValue('3.2.1');
    });

    it('shows saved earlier related integrations when there is no matching package found', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [], // package-a and package-b don't exist
      });

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '1.2.3' },
        { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
      ];

      render(<TestForm initialState={initialRelatedIntegrations} />, {
        wrapper: createReactQueryWrapper(),
      });

      await waitForIntegrationsToBeLoaded();

      const visibleIntegrations = screen.getAllByTestId(COMBO_BOX_SELECTION_TEST_ID);
      const visibleVersionInputs = screen.getAllByTestId(VERSION_INPUT_TEST_ID);

      expect(visibleIntegrations[0]).toHaveTextContent('Package-a');
      expect(visibleVersionInputs[0]).toHaveValue('1.2.3');

      expect(visibleIntegrations[1]).toHaveTextContent('Package-b integration-a');
      expect(visibleVersionInputs[1]).toHaveValue('3.2.1');
    });

    it('shows saved earlier related integrations when API failed', async () => {
      // suppress expected API error messages
      jest.spyOn(console, 'error').mockReturnValue();

      fleetIntegrationsApi.fetchAllIntegrations.mockRejectedValue(new Error('some error'));

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '1.2.3' },
        { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
      ];

      render(<TestForm initialState={initialRelatedIntegrations} />, {
        wrapper: createReactQueryWrapper(),
      });

      await waitForIntegrationsToBeLoaded();

      const visibleIntegrations = screen.getAllByTestId(COMBO_BOX_SELECTION_TEST_ID);
      const visibleVersionInputs = screen.getAllByTestId(VERSION_INPUT_TEST_ID);

      expect(visibleIntegrations[0]).toHaveTextContent('Package-a');
      expect(visibleVersionInputs[0]).toHaveValue('1.2.3');

      expect(visibleIntegrations[1]).toHaveTextContent('Package-b integration-a');
      expect(visibleVersionInputs[1]).toHaveValue('3.2.1');
    });
  });

  describe('valid form submitting', () => {
    it('returns undefined when no integrations are selected', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />, { wrapper: createReactQueryWrapper() });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith({
        data: undefined,
        isValid: true,
      });
    });

    it('returns a selected integration', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
        optionIndex: 0,
      });
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ integration: undefined, package: 'package-a', version: '^1.2.0' }],
        isValid: true,
      });
    });

    it('returns a selected integration with version range modified ', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.2.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
        optionIndex: 0,
      });
      await setVersion({ input: screen.getByTestId(VERSION_INPUT_TEST_ID), value: '1.0.0' });
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ integration: undefined, package: 'package-a', version: '1.0.0' }],
        isValid: true,
      });
    });

    it('returns a saved earlier integration', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.0.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '1.2.3' },
      ];
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialRelatedIntegrations} onSubmit={handleSubmit} />, {
        wrapper: createReactQueryWrapper(),
      });
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ integration: undefined, package: 'package-a', version: '1.2.3' }],
        isValid: true,
      });
    });

    it('returns a saved earlier integration when there is no matching package found', async () => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [],
      });

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '1.2.3' },
      ];
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialRelatedIntegrations} onSubmit={handleSubmit} />, {
        wrapper: createReactQueryWrapper(),
      });
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ integration: undefined, package: 'package-a', version: '1.2.3' }],
        isValid: true,
      });
    });

    it('returns a saved earlier integration when API failed', async () => {
      // suppress expected API error messages
      jest.spyOn(console, 'error').mockReturnValue();

      fleetIntegrationsApi.fetchAllIntegrations.mockRejectedValue(new Error('some error'));

      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '^1.2.3' },
      ];
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialRelatedIntegrations} onSubmit={handleSubmit} />, {
        wrapper: createReactQueryWrapper(),
      });
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ integration: undefined, package: 'package-a', version: '^1.2.3' }],
        isValid: true,
      });
    });
  });

  describe('validation errors', () => {
    it('shows an error after clearing selected integration', async () => {
      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });
      await clearEuiComboBoxSelection({
        clearButton: screen.getByTestId(COMBO_BOX_CLEAR_BUTTON_TEST_ID),
      });

      expect(screen.getByTestId(RELATED_INTEGRATION_ROW)).toHaveTextContent(
        'Integration must be selected'
      );
    });

    it('shows an error when version range is invalid', async () => {
      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });
      await setVersion({ input: screen.getByTestId(VERSION_INPUT_TEST_ID), value: '100' });

      expect(screen.getByTestId(RELATED_INTEGRATION_ROW)).toHaveTextContent(
        'Version range is invalid'
      );
    });
  });

  describe('removing an item', () => {
    it('removes just added item', async () => {
      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await removeRelatedIntegrationRow();

      expect(screen.queryByTestId(RELATED_INTEGRATION_ROW)).not.toBeInTheDocument();
    });

    it('removes just added item after integration was selected', async () => {
      render(<TestForm />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });
      await removeRelatedIntegrationRow();

      expect(screen.queryByTestId(RELATED_INTEGRATION_ROW)).not.toBeInTheDocument();
    });

    it('submits undefined when all just added integrations removed', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />, { wrapper: createReactQueryWrapper() });

      await addRelatedIntegrationRow();
      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
      });
      await removeRelatedIntegrationRow();
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: undefined,
        isValid: true,
      });
    });

    it('submits undefined after previously saved integrations were removed', async () => {
      const initialRelatedIntegrations: RelatedIntegration[] = [
        { package: 'package-a', version: '^1.2.3' },
      ];
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialRelatedIntegrations} onSubmit={handleSubmit} />, {
        wrapper: createReactQueryWrapper(),
      });

      await waitForIntegrationsToBeLoaded();
      await removeRelatedIntegrationRow();
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: undefined,
        isValid: true,
      });
    });
  });
});

interface TestFormProps {
  initialState?: RelatedIntegration[];
  onSubmit?: (args: { data: RelatedIntegration[]; isValid: boolean }) => void;
}

function TestForm({ initialState, onSubmit }: TestFormProps): JSX.Element {
  const { form } = useForm({
    options: { stripEmptyFields: false },
    schema: {
      relatedIntegrationsField: {
        type: FIELD_TYPES.JSON,
      },
    },
    defaultValue: {
      relatedIntegrationsField: initialState,
    },
    onSubmit: async (formData, isValid) =>
      onSubmit?.({ data: formData.relatedIntegrationsField, isValid }),
  });

  return (
    <Form form={form} component="form">
      <RelatedIntegrations path="relatedIntegrationsField" />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </Form>
  );
}

function waitForIntegrationsToBeLoaded(): Promise<void> {
  return waitForElementToBeRemoved(screen.queryAllByRole('progressbar'));
}

function addRelatedIntegrationRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add integration'));
  });
}

function removeRelatedIntegrationRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByTestId(REMOVE_INTEGRATION_ROW_BUTTON_TEST_ID));
  });
}

function showEuiComboBoxOptions(comboBoxToggleButton: HTMLElement): Promise<void> {
  fireEvent.click(comboBoxToggleButton);

  return waitFor(() => {
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
}

function selectEuiComboBoxOption({
  comboBoxToggleButton,
  optionIndex,
}: {
  comboBoxToggleButton: HTMLElement;
  optionIndex: number;
}): Promise<void> {
  return act(async () => {
    await showEuiComboBoxOptions(comboBoxToggleButton);

    fireEvent.click(screen.getAllByRole('option')[optionIndex]);
  });
}

function clearEuiComboBoxSelection({ clearButton }: { clearButton: HTMLElement }): Promise<void> {
  return act(async () => {
    fireEvent.click(clearButton);
  });
}

function selectFirstEuiComboBoxOption({
  comboBoxToggleButton,
}: {
  comboBoxToggleButton: HTMLElement;
}): Promise<void> {
  return selectEuiComboBoxOption({ comboBoxToggleButton, optionIndex: 0 });
}

function setVersion({ input, value }: { input: HTMLInputElement; value: string }): Promise<void> {
  return act(async () => {
    fireEvent.input(input, {
      target: { value },
    });
  });
}

function submitForm(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Submit'));
  });
}
