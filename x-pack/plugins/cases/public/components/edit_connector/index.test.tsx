/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditConnector, EditConnectorProps } from './index';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { basicCase, basicPush, caseUserActions, connectorsMock } from '../../containers/mock';
import { CaseConnector } from '../../containers/configure/types';

const onSubmit = jest.fn();
const updateCase = jest.fn();
const caseServices = {
  '123': {
    ...basicPush,
    firstPushIndex: 0,
    lastPushIndex: 0,
    commentsToUpdate: [],
    hasDataToPush: true,
  },
};
const getDefaultProps = (): EditConnectorProps => {
  return {
    caseData: basicCase,
    caseServices,
    connectorName: connectorsMock[0].name,
    connectors: connectorsMock,
    hasDataToPush: true,
    isLoading: false,
    isValidConnector: true,
    onSubmit,
    updateCase,
    userActions: caseUserActions,
    userCanCrud: true,
  };
};

describe('EditConnector ', () => {
  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('Renders servicenow connector from case initially', async () => {
    const defaultProps = getDefaultProps();
    const serviceNowProps = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: { ...defaultProps.caseData.connector, id: 'servicenow-1' },
      },
    };

    render(
      <TestProviders>
        <EditConnector {...serviceNowProps} />
      </TestProviders>
    );

    expect(await screen.findByText('My Connector')).toBeInTheDocument();
  });

  it('Renders no connector, and then edit', async () => {
    const defaultProps = getDefaultProps();
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="has-data-to-push-button"]`).exists()).toBeTruthy();
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    expect(
      wrapper.find(`span[data-test-subj="dropdown-connector-no-connector"]`).last().exists()
    ).toBeTruthy();

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    await waitFor(() => wrapper.update());

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();
  });

  it('Edit external service on submit', async () => {
    const defaultProps = getDefaultProps();
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();

    wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    await waitFor(() => expect(onSubmit.mock.calls[0][0]).toBe('resilient-2'));
  });

  it('Revert to initial external service on error', async () => {
    const defaultProps = getDefaultProps();
    onSubmit.mockImplementation((connector, onSuccess, onError) => {
      onError(new Error('An error has occurred'));
    });

    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: { ...defaultProps.caseData.connector, id: 'servicenow-1' },
      },
    };

    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    await waitFor(() => {
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
      wrapper.update();
      expect(
        wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()
      ).toBeTruthy();
      wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    });

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).exists()).toBeFalsy();
    });

    /**
     * If an error is being throw on submit the selected connector should
     * be reverted to the initial one. In our test the initial one is the .servicenow-1
     * connector. The title of the .servicenow-1 connector is My Connector.
     */
    expect(wrapper.text().includes('My Connector')).toBeTruthy();
  });

  it('Resets selector on cancel', async () => {
    const defaultProps = getDefaultProps();
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

    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    wrapper.update();
    wrapper.find(`[data-test-subj="edit-connectors-cancel"]`).last().simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).exists()).toBeFalsy();
    });

    expect(wrapper.text().includes('My Connector')).toBeTruthy();
  });

  it('Renders loading spinner', async () => {
    const defaultProps = getDefaultProps();
    const props = { ...defaultProps, isLoading: true };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    await waitFor(() =>
      expect(wrapper.find(`[data-test-subj="connector-loading"]`).last().exists()).toBeTruthy()
    );
  });

  it('does not allow the connector to be edited when the user does not have write permissions', async () => {
    const defaultProps = getDefaultProps();
    const props = { ...defaultProps, userCanCrud: false };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    await waitFor(() =>
      expect(wrapper.find(`[data-test-subj="connector-edit"]`).exists()).toBeFalsy()
    );

    expect(wrapper.find(`[data-test-subj="has-data-to-push-button"]`).exists()).toBeFalsy();
  });

  it('displays the callout message when none is selected', async () => {
    const defaultProps = getDefaultProps();
    const props = { ...defaultProps, connectors: [] };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    wrapper.update();
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
    wrapper.update();
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="push-callouts"]`).exists()).toEqual(true);
    });
  });

  it('disables the save button until changes are done ', async () => {
    const defaultProps = getDefaultProps();
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
    userEvent.click(result.getAllByTestId('dropdown-connector-no-connector')[0]);
    expect(result.getByTestId('edit-connectors-submit')).toBeEnabled();

    // this strange assertion is required because of existing race conditions inside the EditConnector component
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
  });

  it('disables the save button when no connector is the default', async () => {
    const defaultProps = getDefaultProps();
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
    userEvent.click(result.getAllByTestId('dropdown-connector-resilient-2')[0]);
    expect(result.getByTestId('edit-connectors-submit')).toBeEnabled();

    // this strange assertion is required because of existing race conditions inside the EditConnector component
    await waitFor(() => {
      expect(true).toBeTruthy();
    });
  });

  it('shows the actions permission message if the user does not have read access to actions', async () => {
    const defaultProps = getDefaultProps();
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
    const defaultProps = getDefaultProps();
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
    const defaultProps = getDefaultProps();
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
    const defaultProps = getDefaultProps();
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(<EditConnector {...defaultProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('has-data-to-push-button')).toBe(null);
    });
  });
});
