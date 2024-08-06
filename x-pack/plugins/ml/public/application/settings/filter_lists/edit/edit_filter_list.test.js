/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { EditFilterList } from './edit_filter_list';

jest.mock('../../../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
}));

// Mock the call for loading the list of filters.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'safe_domains',
  description: 'List of known safe domains',
  items: ['google.com', 'google.co.uk', 'elastic.co', 'youtube.com'],
  used_by: {
    detectors: ['high info content'],
    jobs: ['dns_exfiltration'],
  },
};
const mockFilters = jest.fn().mockImplementation(() => Promise.resolve(mockTestFilter));
const mockKibanaContext = {
  services: {
    docLinks: { links: { ml: { customRules: 'test' } } },
    notifications: { toasts: { addDanger: jest.fn(), addError: jest.fn() } },
    mlServices: {
      mlApiServices: {
        filters: {
          filters: mockFilters,
        },
      },
    },
  },
};

const mockReact = React;
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaContext,
      });
    };
    return EnhancedType;
  },
}));

const props = {
  canCreateFilter: true,
  canDeleteFilter: true,
};

async function prepareEditTest() {
  const component = render(
    <IntlProvider locale="en">
      <EditFilterList {...props} />
    </IntlProvider>
  );

  return component;
}

describe('EditFilterList', () => {
  test('renders the edit page for a new filter list and updates ID', async () => {
    const { getByTestId, getByText } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} />
      </IntlProvider>
    );

    // The filter list should be empty.
    expect(getByText('No items have been added')).toBeInTheDocument();

    const mlNewFilterListIdInput = getByTestId('mlNewFilterListIdInput');
    expect(mlNewFilterListIdInput).toBeInTheDocument();

    await userEvent.type(mlNewFilterListIdInput, 'new_filter_list');

    await waitFor(() => {
      expect(mlNewFilterListIdInput).toHaveValue('new_filter_list');
    });

    // After entering a valid ID, the save button should be enabled.
    expect(getByTestId('mlFilterListSaveButton')).toBeEnabled();

    await userEvent.clear(mlNewFilterListIdInput);

    // Emptied again, the save button should be disabled.
    await waitFor(() => {
      expect(getByTestId('mlFilterListSaveButton')).toBeDisabled();
    });

    await userEvent.type(mlNewFilterListIdInput, '#invalid#$%^', { delay: 1 });

    await waitFor(() => {
      expect(mlNewFilterListIdInput).toHaveValue('#invalid#$%^');
    });

    // After entering an invalid ID, the save button should still be disabled.
    await waitFor(() => {
      expect(getByTestId('mlFilterListSaveButton')).toBeDisabled();
    });

    expect(mockFilters).toHaveBeenCalledTimes(0);
  });

  test('renders the edit page for an existing filter list and updates description', async () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} filterId="safe_domains" />
      </IntlProvider>
    );

    expect(mockFilters).toHaveBeenCalledWith({ filterId: 'safe_domains' });

    waitFor(() => {
      expect(getByTestId('mlNewFilterListDescriptionText')).toHaveValue(
        'List of known safe domains'
      );
    });

    const mlFilterListEditDescriptionButton = getByTestId('mlFilterListEditDescriptionButton');

    expect(mlFilterListEditDescriptionButton).toBeInTheDocument();

    // Workaround with `pointerEventsCheck` so we don't get "Error: unable to click element as it has or inherits pointer-events set to "none"."
    await userEvent.click(mlFilterListEditDescriptionButton, { pointerEventsCheck: 0 });

    const mlFilterListDescriptionInput = getByTestId('mlFilterListDescriptionInput');

    waitFor(() => {
      expect(mlFilterListDescriptionInput).toBeInTheDocument();
      expect(mlFilterListDescriptionInput).toHaveValue('List of known safe domains');
    });

    await userEvent.clear(mlFilterListDescriptionInput);
    await userEvent.type(mlFilterListDescriptionInput, 'Known safe web domains');
    await userEvent.click(mlFilterListEditDescriptionButton);

    waitFor(() => {
      expect(getByTestId('mlNewFilterListDescriptionText')).toHaveValue('Known safe web domains');
    });
  });

  test('updates the items per page', async () => {
    const component = await prepareEditTest();
    const instance = component.container.firstChild;

    instance.setItemsPerPage(500);
    expect(component.asFragment()).toMatchSnapshot();
  });

  test('renders after selecting an item and deleting it', async () => {
    const component = await prepareEditTest();
    const instance = component.container.firstChild;

    instance.setItemSelected(mockTestFilter.items[1], true);
    expect(component.asFragment()).toMatchSnapshot();

    instance.deleteSelectedItems();
    expect(component.asFragment()).toMatchSnapshot();
  });

  test('adds new items to filter list', async () => {
    const component = await prepareEditTest();
    const instance = component.container.firstChild;

    instance.addItems(['amazon.com', 'spotify.com']);
    expect(component.asFragment()).toMatchSnapshot();
  });
});
