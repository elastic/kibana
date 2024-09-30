/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { basicCase, connectorsMock } from '../../containers/mock';
import { ConnectorsForm } from './connectors_form';
import type { CaseConnectors } from '../../containers/types';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { choices, resilientIncidentTypes, resilientSeverity } from '../connectors/mock';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { useGetIncidentTypes } from '../connectors/resilient/use_get_incident_types';
import { useGetSeverity } from '../connectors/resilient/use_get_severity';

jest.mock('../connectors/servicenow/use_get_choices');
jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');

const useGetChoicesMock = useGetChoices as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

describe('ConnectorsForm ', () => {
  const caseConnectors = getCaseConnectorsMockResponse();
  const onSubmit = jest.fn();
  const onCancel = jest.fn();

  const caseConnectorsWithFields = {
    ...caseConnectors,
    'servicenow-1': {
      ...caseConnectors['servicenow-1'],
      fields: {
        urgency: '3',
        severity: '3',
        impact: '2',
        category: 'Denial of Service',
        subcategory: '12',
      },
    },
    'resilient-2': {
      ...caseConnectors['servicenow-1'],
      fields: {
        incidentTypes: [],
        severityCode: '5',
      },
    },
  } as CaseConnectors;

  const props = {
    caseData: { ...basicCase, connector: caseConnectorsWithFields['servicenow-1'] },
    caseConnectors: caseConnectorsWithFields,
    supportedActionConnectors: connectorsMock,
    isLoading: false,
    onSubmit,
    onCancel,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockReturnValue({ isLoading: false, data: { data: choices } });
    useGetIncidentTypesMock.mockReturnValue({
      isLoading: false,
      data: { data: resilientIncidentTypes },
    });
    useGetSeverityMock.mockReturnValue({ isLoading: false, data: { data: resilientSeverity } });

    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    expect(screen.getByTestId('caseConnectors')).toBeInTheDocument();
    expect(screen.getByTestId('edit-connector-fields-form-flex-item')).toBeInTheDocument();
    expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-connectors-cancel')).toBeInTheDocument();
  });

  it('sets the selected connector correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });
  });

  it('sets the fields for the selected connector correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('connector-fields-sn-itsm')).toBeInTheDocument();
    });

    const severitySelect = screen.getByTestId('severitySelect');
    const urgencySelect = screen.getByTestId('urgencySelect');
    const impactSelect = screen.getByTestId('impactSelect');
    const categorySelect = screen.getByTestId('categorySelect');
    const subcategorySelect = screen.getByTestId('subcategorySelect');

    expect(severitySelect).toHaveValue('3');
    expect(urgencySelect).toHaveValue('3');
    expect(impactSelect).toHaveValue('2');
    expect(categorySelect).toHaveValue('Denial of Service');
    expect(subcategorySelect).toHaveValue('12');
  });

  it('changes to a new corrector correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(screen.queryByTestId('connector-fields-sn-itsm')).not.toBeInTheDocument();
      expect(screen.getByTestId('connector-fields-resilient')).toBeInTheDocument();
    });

    const incidentTypeComboBox = screen.getByTestId('incidentTypeComboBox');
    const severitySelect = screen.getByTestId('severitySelect');

    expect(incidentTypeComboBox).not.toHaveValue();
    expect(severitySelect).toHaveValue('5');
  });

  it('submits correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('connector-fields-sn-itsm')).toBeInTheDocument();
    });

    const severitySelect = screen.getByTestId('severitySelect');
    await userEvent.selectOptions(screen.getByTestId('severitySelect'), ['2']);

    expect(severitySelect).toHaveValue('2');
    await userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'servicenow-1',
        name: 'My SN connector',
        type: '.servicenow',
        fields: {
          urgency: '3',
          // severity changed from 3 to 2
          severity: '2',
          impact: '2',
          category: 'Denial of Service',
          subcategory: '12',
        },
      });
    });
  });

  it('changes to a new corrector correctly and its fields correctly', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(screen.queryByTestId('connector-fields-sn-itsm')).not.toBeInTheDocument();
      expect(screen.getByTestId('connector-fields-resilient')).toBeInTheDocument();
    });

    const severitySelect = screen.getByTestId('severitySelect');
    await userEvent.selectOptions(severitySelect, ['4']);

    await userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'resilient-2',
        name: 'My Resilient connector',
        type: '.resilient',
        // severity changed from 5 to 4
        fields: { incidentTypes: null, severityCode: '4' },
      });
    });
  });

  it('disables the save button if the fields have not been changed', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-connectors-submit')).toBeDisabled();
  });

  it('disables the save button if the fields have not been changed and the fields contain null values', async () => {
    const caseConnectorsWithNullFields = {
      ...caseConnectorsWithFields,
      'servicenow-1': {
        ...caseConnectorsWithFields['servicenow-1'],
        fields: {
          ...caseConnectorsWithFields['servicenow-1'].fields,
          impact: null,
        },
      },
    } as CaseConnectors;

    const caseData = { ...basicCase, connector: caseConnectorsWithNullFields['servicenow-1'] };

    appMockRender.render(
      <ConnectorsForm
        {...props}
        caseConnectors={caseConnectorsWithNullFields}
        caseData={caseData}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-connectors-submit')).toBeDisabled();
    });
  });

  it('calls onCancel when clicking the cancel button', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('edit-connectors-cancel'));
    expect(onCancel).toBeCalled();
  });

  it('disables the submit button correctly if the initial connector is the none', async () => {
    appMockRender.render(<ConnectorsForm {...props} caseData={basicCase} />);

    await waitFor(() => {
      expect(screen.getByText('No connector selected')).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-connectors-submit')).toBeDisabled();
  });

  it('can select the none connector', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getAllByTestId('dropdown-connector-no-connector')[0]);

    await userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      });
    });
  });

  it('changes to a new corrector does not disables the submit button with no changes in the fields', async () => {
    appMockRender.render(<ConnectorsForm {...props} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(screen.queryByTestId('connector-fields-sn-itsm')).not.toBeInTheDocument();
      expect(screen.getByTestId('connector-fields-resilient')).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-connectors-submit')).not.toBeDisabled();
  });

  it('does not disables the submit button if the connector is deleted', async () => {
    appMockRender.render(<ConnectorsForm {...props} supportedActionConnectors={[]} />);

    expect(screen.getByTestId('edit-connectors-submit')).not.toBeDisabled();
  });

  it('changes optional (undefined) values to null', async () => {
    const caseConnectorsOptional = {
      ...caseConnectors,
      'resilient-2': {
        ...caseConnectors['resilient-2'],
        fields: null,
      },
    } as CaseConnectors;

    appMockRender.render(<ConnectorsForm {...props} caseConnectors={caseConnectorsOptional} />);

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(screen.queryByTestId('connector-fields-sn-itsm')).not.toBeInTheDocument();
      expect(screen.getByTestId('connector-fields-resilient')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fields: {
          incidentTypes: null,
          severityCode: null,
        },
        id: 'resilient-2',
        name: 'My Resilient connector',
        type: '.resilient',
      })
    );
  });

  it('resets fields when changing between connectors of the same type', async () => {
    const caseConnectorsOptional = {
      ...caseConnectors,
      'servicenow-2': {
        ...caseConnectors['servicenow-2'],
        fields: null,
      },
    } as CaseConnectors;

    const connectors = [
      ...connectorsMock,
      { ...connectorsMock[0], id: 'servicenow-2', name: 'My SN connector 2' },
    ];

    appMockRender.render(
      <ConnectorsForm
        {...props}
        caseConnectors={caseConnectorsOptional}
        supportedActionConnectors={connectors}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dropdown-connectors'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('dropdown-connector-servicenow-2'));

    await waitFor(() => {
      expect(screen.getByText('My SN connector 2')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fields: {
          category: null,
          subcategory: null,
          impact: null,
          severity: null,
          urgency: null,
        },
        id: 'servicenow-2',
        name: 'My SN connector 2',
        type: '.servicenow',
      })
    );
  });
});
