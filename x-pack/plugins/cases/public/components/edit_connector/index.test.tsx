/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { EditConnectorProps } from '.';
import { EditConnector } from '.';
import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  readCasesPermissions,
  noPushCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { basicCase, connectorsMock } from '../../containers/mock';
import type { CaseConnector } from '../../containers/configure/types';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';

const onSubmit = jest.fn();
const caseConnectors = getCaseConnectorsMockResponse();

const defaultProps: EditConnectorProps = {
  caseData: basicCase,
  supportedActionConnectors: connectorsMock,
  isLoading: false,
  caseConnectors,
  onSubmit,
};

describe('EditConnector ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('Renders the none connector', async () => {
    render(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    expect(
      await screen.findByText(
        'To create and update a case in an external system, select a connector.'
      )
    ).toBeInTheDocument();

    userEvent.click(screen.getByTestId('connector-edit-button'));

    await waitFor(() => {
      expect(screen.getAllByTestId('dropdown-connector-no-connector').length).toBeGreaterThan(0);
    });
  });

  it('Renders servicenow connector from case initially', async () => {
    const serviceNowProps = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    render(
      <TestProviders>
        <EditConnector {...serviceNowProps} />
      </TestProviders>
    );

    expect(await screen.findByText('My SN connector')).toBeInTheDocument();
  });

  it('Renders no connector, and then edit', async () => {
    render(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('connector-edit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('caseConnectors')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();
    });
  });

  it('Edit external service on submit', async () => {
    render(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('connector-edit-button'));
    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'), undefined, {
      skipPointerEventsCheck: true,
    });

    expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          fields: {
            incidentTypes: null,
            severityCode: null,
          },
          id: 'resilient-2',
          name: 'My Resilient connector',
          type: '.resilient',
        },
        expect.anything(),
        expect.anything()
      )
    );
  });

  it('Revert to initial external service on error', async () => {
    onSubmit.mockImplementation((connector, onError, onSuccess) => {
      onError(new Error('An error has occurred'));
    });

    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    render(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('connector-edit-button'));
    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'), undefined, {
      skipPointerEventsCheck: true,
    });

    userEvent.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-connectors-submit')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });
  });

  it('Resets selector on cancel', async () => {
    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    render(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('connector-edit-button'));
    userEvent.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('dropdown-connector-resilient-2'));
    userEvent.click(screen.getByTestId('edit-connectors-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-connectors-submit')).not.toBeInTheDocument();
    });

    expect(screen.getByText('My SN connector')).toBeInTheDocument();
  });

  it('disabled the edit button when is loading', async () => {
    const props = { ...defaultProps, isLoading: true };

    render(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    });
  });

  it('does not shows the callouts when is loading', async () => {
    const props = { ...defaultProps, isLoading: true };

    render(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('push-callouts')).not.toBeInTheDocument();
    });
  });

  it('does not allow the connector to be edited when the user does not have write permissions', async () => {
    render(
      <TestProviders permissions={readCasesPermissions()}>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
    });
  });

  it('display the callout message when none is selected', async () => {
    // default props has the none connector as selected
    const result = appMockRender.render(<EditConnector {...defaultProps} />);

    await waitFor(() => {
      expect(result.getByTestId('push-callouts')).toBeInTheDocument();
    });
  });

  it('disables the save button until changes are done ', async () => {
    const serviceNowProps = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
          fields: {
            urgency: null,
            severity: null,
            impact: null,
            category: null,
            subcategory: null,
          },
        } as CaseConnector,
      },
    };
    const result = render(
      <TestProviders>
        <EditConnector {...serviceNowProps} />
      </TestProviders>
    );

    // the save button should be disabled
    userEvent.click(result.getByTestId('connector-edit-button'));
    expect(result.getByTestId('edit-connectors-submit')).toBeDisabled();

    // simulate changing the connector
    userEvent.click(result.getByTestId('dropdown-connectors'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getAllByTestId('dropdown-connector-no-connector')[0]);

    await waitFor(() => {
      expect(result.getByTestId('edit-connectors-submit')).toBeEnabled();
    });
  });

  it('disables the save button when no connector is the default', async () => {
    const noneConnector = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          id: 'none',
          fields: null,
        } as CaseConnector,
      },
    };
    const result = render(
      <TestProviders>
        <EditConnector {...noneConnector} />
      </TestProviders>
    );

    // the save button should be disabled
    userEvent.click(result.getByTestId('connector-edit-button'));
    expect(result.getByTestId('edit-connectors-submit')).toBeDisabled();

    // simulate changing the connector
    userEvent.click(result.getByTestId('dropdown-connectors'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getAllByTestId('dropdown-connector-resilient-2')[0]);

    await waitFor(() => {
      expect(result.getByTestId('edit-connectors-submit')).toBeEnabled();
    });
  });

  it('shows the actions permission message if the user does not have read access to actions', async () => {
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(<EditConnector {...defaultProps} />);
    await waitFor(() => {
      expect(result.getByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
    });
  });

  it('does not show the actions permission message if the user has read access to actions', async () => {
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };

    const result = appMockRender.render(<EditConnector {...defaultProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('edit-connector-permissions-error-msg')).toBe(null);
    });
  });

  it('does not show the callout if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(<EditConnector {...props} />);
    await waitFor(() => {
      expect(result.getByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
      expect(result.queryByTestId('push-callouts')).toBe(null);
    });
  });

  it('does not show the push button if the user does not have read access to actions', async () => {
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(<EditConnector {...defaultProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('push-to-external-service')).toBe(null);
    });
  });

  it('does not show the push button if the user does not have push permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: noPushCasesPermissions() });
    const result = appMockRender.render(<EditConnector {...defaultProps} />);

    await waitFor(() => {
      expect(result.queryByTestId('push-to-external-service')).toBe(null);
    });
  });

  it('does not show the edit connectors pencil if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    appMockRender.render(<EditConnector {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('connector-edit-header')).toBeInTheDocument();
      expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    });
  });

  it('does not show the edit connectors pencil if the user does not have push permissions', async () => {
    const props = { ...defaultProps, connectors: [] };
    appMockRender = createAppMockRenderer({ permissions: noPushCasesPermissions() });

    appMockRender.render(<EditConnector {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('connector-edit-header')).toBeInTheDocument();
      expect(screen.queryByTestId('connector-edit-button')).toBe(null);
    });
  });
});
