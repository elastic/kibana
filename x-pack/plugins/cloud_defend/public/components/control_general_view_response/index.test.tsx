/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';
import { TestProvider } from '../../test/test_provider';
import { ControlGeneralViewResponse } from '.';
import { Response, Selector } from '../../../common';
import * as i18n from '../control_general_view/translations';

describe('<ControlGeneralViewSelector />', () => {
  const onChange = jest.fn();
  const onRemove = jest.fn();
  const onDuplicate = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const mockSelector: Selector = {
    type: 'file',
    name: 'mock',
    operation: ['createFile'],
  };

  const mockSelector2: Selector = {
    type: 'file',
    name: 'mock2',
    operation: ['modifyExecutable'],
  };

  const mockSelector3: Selector = {
    type: 'file',
    name: 'mock3',
    operation: ['createFile'],
    targetFilePath: ['/**'],
  };

  const mockExclude: Selector = {
    type: 'file',
    name: 'mockExclude',
    containerImageName: ['nginx'],
  };

  const mockProcessSelector: Selector = {
    type: 'process',
    name: 'mockProcess',
    operation: ['exec'],
  };

  const mockResponse: Response = {
    type: 'file',
    match: [mockSelector.name],
    actions: ['alert'],
  };

  const mockResponse2: Response = {
    type: 'file',
    match: [mockSelector.name],
    actions: ['alert', 'block'],
  };

  const mockResponse3: Response = {
    type: 'file',
    match: [mockSelector3.name],
    actions: ['alert', 'block'],
  };

  const mockProcessResponse: Response = {
    type: 'process',
    match: [mockProcessSelector.name],
    actions: ['alert', 'block'],
  };

  const WrappedComponent = ({
    response = { ...mockResponse },
    responses,
  }: {
    response?: Response;
    responses?: Response[];
  }) => {
    return (
      <TestProvider params={params}>
        <ControlGeneralViewResponse
          index={0}
          selectors={[mockSelector, mockSelector2, mockSelector3, mockExclude]}
          response={response}
          responses={responses || [response, mockResponse2, mockResponse3]}
          onChange={onChange}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
        />
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
    onRemove.mockClear();
    onDuplicate.mockClear();
  });

  it('renders a response that matches a selector and has alert action enabled', () => {
    const { getByTestId, queryByTestId } = render(<WrappedComponent />);
    expect(getByTestId('cloud-defend-responsematch').querySelector('.euiBadge__text')).toBeTruthy();
    expect(queryByTestId('cloud-defend-responseexclude')).toBeFalsy();
    expect(getByTestId('cloud-defend-chkalertaction')).toBeChecked();
    expect(getByTestId('cloud-defend-chkblockaction')).not.toBeChecked();
  });

  it('allows the user to add more selectors to match on', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    await showEuiComboBoxOptions();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-responsematch-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('mock2');

    userEvent.click(options[0]);

    const updatedResponse: Response = onChange.mock.calls[0][0];

    rerender(<WrappedComponent response={updatedResponse} />);

    expect(updatedResponse.match).toContain('mock');
    expect(updatedResponse.match).toContain('mock2');

    // test that 1 option remains
    const updatedOptions = getByTestId(
      'comboBoxOptionsList cloud-defend-responsematch-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(updatedOptions).toHaveLength(2);
    expect(updatedOptions[0].textContent).toContain('mock3');
    expect(updatedOptions[1].textContent).toContain('mockExclude');
  });

  it('ensures there is at least 1 selector to match', () => {
    const { getByText, getByTitle, rerender } = render(<WrappedComponent />);

    userEvent.click(getByTitle('Remove mock from selection in this group'));

    const updatedResponse: Response = onChange.mock.calls[0][0];
    rerender(<WrappedComponent response={updatedResponse} />);

    expect(getByText(i18n.errorValueRequired)).toBeTruthy();
  });

  it('allows the user to exclude selectors', async () => {
    const { getByTestId, getAllByTestId, rerender } = render(<WrappedComponent />);

    // first must click button to show combobox
    userEvent.click(getByTestId('cloud-defend-btnshowexclude'));

    let updatedResponse: Response = onChange.mock.calls[0][0];
    rerender(<WrappedComponent response={updatedResponse} />);

    getAllByTestId('comboBoxSearchInput')[1].focus();

    let options = await waitFor(() =>
      getByTestId('comboBoxOptionsList cloud-defend-responseexclude-optionsList').querySelectorAll(
        '.euiComboBoxOption__content'
      )
    );
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('mock2');
    expect(options[1].textContent).toBe('mock3');
    expect(options[2].textContent).toBe('mockExclude');

    userEvent.click(options[2]);

    updatedResponse = onChange.mock.calls[0][0];
    rerender(<WrappedComponent response={updatedResponse} />);

    expect(updatedResponse.exclude).toContain('mockExclude');

    // focus 'match' input box, lets ensure selectors can't be re-used across 'match' and 'exclude' fields
    getAllByTestId('comboBoxSearchInput')[0].focus();

    options = await waitFor(() =>
      getByTestId('comboBoxOptionsList cloud-defend-responsematch-optionsList').querySelectorAll(
        '.euiComboBoxOption__content'
      )
    );
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe('mock2');
  });

  it('allows the user to enable block action (which should force alert action on)', () => {
    const { getByTestId } = render(<WrappedComponent />);
    const checkBox = getByTestId('cloud-defend-chkblockaction');

    if (checkBox) {
      userEvent.click(checkBox);
    }

    const response: Response = onChange.mock.calls[0][0];
    expect(response.actions).toContain('alert');
    expect(response.actions).toContain('block');
  });

  it('doesnt show block action for process responses', () => {
    const { findByTestId } = render(<WrappedComponent response={mockProcessResponse} />);
    const checkBox = findByTestId('cloud-defend-chkblockaction');

    expect(checkBox).toMatchObject({});
  });

  it('shows an error if user is using block w/o targetFilePath', () => {
    const { getByText } = render(<WrappedComponent response={mockResponse2} />);

    expect(getByText(i18n.errorBlockActionRequiresTargetFilePath)).toBeTruthy();
  });

  it('shows a warning if user is using block w targetFilePath /**', () => {
    const { getByText } = render(<WrappedComponent response={mockResponse3} />);

    expect(getByText(i18n.warningFIMUsingSlashStarStarTitle)).toBeTruthy();
  });

  it('allows the user to remove the response', async () => {
    const { getByTestId } = render(<WrappedComponent />);
    const btnPopover = getByTestId('cloud-defend-btnresponsepopover');
    userEvent.click(btnPopover);

    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btndeleteresponse')));

    expect(onRemove.mock.calls).toHaveLength(1);
    expect(onRemove.mock.calls[0][0]).toEqual(0);
  });

  it('prevents the last response from being removed', async () => {
    const { getByTestId } = render(<WrappedComponent responses={[mockResponse]} />);
    const btnPopover = getByTestId('cloud-defend-btnresponsepopover');
    userEvent.click(btnPopover);

    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btndeleteresponse')));

    expect(onRemove.mock.calls).toHaveLength(0);
  });

  it('allows the user to duplicate the response', async () => {
    const { getByTestId } = render(<WrappedComponent />);
    const btnPopover = getByTestId('cloud-defend-btnresponsepopover');
    userEvent.click(btnPopover);

    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btnduplicateresponse')));

    expect(onDuplicate.mock.calls).toHaveLength(1);
    expect(onDuplicate.mock.calls[0][0]).toEqual(mockResponse);
  });

  it('shows an error if no actions specified', async () => {
    const { getByTestId, getByText, rerender } = render(<WrappedComponent />);

    const checkBox = getByTestId('cloud-defend-chkalertaction');
    if (checkBox) {
      userEvent.click(checkBox);
    }

    const updatedResponse = onChange.mock.calls[0][0];
    rerender(<WrappedComponent response={updatedResponse} />);

    expect(getByText(i18n.errorActionRequired)).toBeTruthy();
    expect(updatedResponse.hasErrors).toBeTruthy();
  });
});
