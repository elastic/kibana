/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks/lens_plugin_mock';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { VisualizeESQL } from './visualize_esql';

describe('VisualizeESQL', () => {
  function renderComponent(
    userOverrides?: unknown,
    newLensService?: LensPublicStart,
    setVisibilitySpy?: () => void,
    errorMessages?: string[]
  ) {
    const lensService = newLensService ?? lensPluginMock.createStartContract();
    const dataViewsService = {
      ...dataViewPluginMocks.createStartContract(),
      create: jest.fn().mockReturnValue(
        Promise.resolve({
          title: 'foo',
          id: 'foo',
          toSpec: jest.fn(),
          toMinimalSpec: jest.fn(),
          isPersisted: jest.fn().mockReturnValue(false),
          fields: {
            getByName: jest.fn(),
          },
        })
      ),
    };
    const uiActionsService = uiActionsPluginMock.createStartContract();
    const columns = [
      {
        name: 'bytes',
        id: 'bytes',
        meta: {
          type: 'number',
        },
      },
      {
        name: 'destination',
        id: 'destination',
        meta: {
          type: 'keyword',
        },
      },
    ] as DatatableColumn[];

    const ObservabilityAIAssistantMultipaneFlyoutContext = React.createContext<any>(undefined);

    render(
      <ObservabilityAIAssistantMultipaneFlyoutContext.Provider
        value={{
          container: document.createElement('div'),
          setVisibility: setVisibilitySpy ?? jest.fn(),
        }}
      >
        <VisualizeESQL
          lens={lensService}
          dataViews={dataViewsService}
          uiActions={uiActionsService}
          columns={columns}
          query={'from foo | keep bytes, destination'}
          onActionClick={jest.fn()}
          userOverrides={userOverrides}
          errorMessages={errorMessages}
          ObservabilityAIAssistantMultipaneFlyoutContext={
            ObservabilityAIAssistantMultipaneFlyoutContext
          }
          rows={[]}
        />
      </ObservabilityAIAssistantMultipaneFlyoutContext.Provider>
    );
  }

  it('should render the embeddable if no initial input is given', async () => {
    renderComponent();
    await waitFor(() =>
      expect(screen.getByTestId('observabilityAiAssistantESQLLensChart')).toMatchInlineSnapshot(`
        <div
          class="euiFlexItem emotion-euiFlexItem-grow-1"
          data-test-subj="observabilityAiAssistantESQLLensChart"
        >
          <span>
            Lens Embeddable Component
          </span>
        </div>
      `)
    );
  });

  it('should run the suggestions api if no initial input is given', async () => {
    const suggestionsApiSpy = jest.fn();
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: suggestionsApiSpy,
      }),
    };
    renderComponent(undefined, lensService);
    await waitFor(() => expect(suggestionsApiSpy).toHaveBeenCalled());
  });

  it('should not run the suggestions api if no initial input is given', async () => {
    const suggestionsApiSpy = jest.fn();
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: suggestionsApiSpy,
      }),
    };
    renderComponent({}, lensService);
    await waitFor(() => expect(suggestionsApiSpy).not.toHaveBeenCalled());
  });

  it('should run the setVisibility callback if edit button is clicked', async () => {
    const setVisibilitySpy = jest.fn();
    renderComponent({}, undefined, setVisibilitySpy);
    await waitFor(() => {
      userEvent.click(screen.getByTestId('observabilityAiAssistantLensESQLEditButton'));
      expect(setVisibilitySpy).toHaveBeenCalled();
    });
  });

  it('should display the errors if given', async () => {
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: jest.fn(),
      }),
    };
    renderComponent({}, lensService, undefined, ['There is an error mate']);
    await waitFor(() => expect(screen.findByTestId('observabilityAiAssistantErrorsList')));
  });

  it('should not display the table on first render', async () => {
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: jest.fn(),
      }),
    };
    renderComponent({}, lensService);
    // the button to render a table should be present
    await waitFor(() =>
      expect(screen.findByTestId('observabilityAiAssistantLensESQLDisplayTableButton'))
    );

    await waitFor(() =>
      expect(screen.queryByTestId('observabilityAiAssistantESQLDataGrid')).not.toBeInTheDocument()
    );
  });

  it('should display the table when user clicks the table button', async () => {
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: jest.fn(),
      }),
    };
    renderComponent({}, lensService);
    await waitFor(() => {
      userEvent.click(screen.getByTestId('observabilityAiAssistantLensESQLDisplayTableButton'));
      expect(screen.findByTestId('observabilityAiAssistantESQLDataGrid'));
    });
  });

  it('should render the ESQLDataGrid if Lens returns a table', async () => {
    const lensService = {
      ...lensPluginMock.createStartContract(),
      stateHelperApi: jest.fn().mockResolvedValue({
        formula: jest.fn(),
        suggestions: jest.fn(),
      }),
    };
    renderComponent(
      {
        attributes: {
          visualizationType: 'lnsDatatable',
        },
      },
      lensService
    );
    await waitFor(() => {
      expect(screen.findByTestId('observabilityAiAssistantESQLDataGrid'));
    });
  });
});
