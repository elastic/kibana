/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as testingLibraryRender, waitFor } from '@testing-library/react';
import { ConnectLLMButton } from './connect_llm_button';
import { useKibana } from '../../hooks/use_kibana';
import { useLoadConnectors } from '../../hooks/use_load_connectors';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const render = (children: React.ReactNode) =>
  testingLibraryRender(<IntlProvider locale="en">{children}</IntlProvider>);

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_load_connectors');
jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));

const mockConnectors = {
  '1': { title: 'Connector 1' },
  '2': { title: 'Connector 2' },
};

describe('ConnectLLMButton', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        triggersActionsUi: {
          getAddConnectorFlyout: () => (
            <div data-test-subj="addConnectorFlyout">Add Connector Flyout</div>
          ),
        },
      },
    });
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: mockConnectors,
      refetch: jest.fn(),
      isLoading: false,
      isSuccess: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the empty state when there are no connectors', () => {
    (useLoadConnectors as jest.Mock).mockReturnValueOnce({
      data: {},
      isLoading: false,
      isSuccess: true,
    });
    const { getByTestId } = render(<ConnectLLMButton />);
    expect(getByTestId('connectLLMButton')).toBeInTheDocument();
  });

  it('show the flyout when the button is clicked', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: {},
      isLoading: false,
      isSuccess: true,
    });
    const { getByTestId, queryByTestId } = render(<ConnectLLMButton />);

    expect(queryByTestId('addConnectorFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('connectLLMButton'));
    await waitFor(() => expect(getByTestId('addConnectorFlyout')).toBeInTheDocument());
  });

  it('show success button when connector exists', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [{}],
      isLoading: false,
      isSuccess: true,
    });
    const { queryByTestId } = render(<ConnectLLMButton />);

    expect(queryByTestId('successConnectLLMButton')).toBeInTheDocument();
  });
});
