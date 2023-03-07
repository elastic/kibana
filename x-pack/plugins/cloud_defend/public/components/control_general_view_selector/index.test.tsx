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
import { TestProvider } from '../../test/test_provider';
import { ControlGeneralViewSelector } from '.';
import { ControlSelector, ControlSelectorCondition, ControlSelectorOperation } from '../../types';
import * as i18n from '../control_general_view/translations';

describe('<ControlGeneralViewSelector />', () => {
  const onChange = jest.fn();
  const onRemove = jest.fn();
  const onDuplicate = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const mockSelector: ControlSelector = {
    name: 'mock',
    operation: [ControlSelectorOperation.createExecutable],
  };

  const mockSelector2: ControlSelector = {
    name: 'mock2',
    operation: [ControlSelectorOperation.modifyExecutable],
  };

  const WrappedComponent = ({
    selector = { ...mockSelector },
    selectors,
  }: {
    selector?: ControlSelector;
    selectors?: ControlSelector[];
  }) => {
    return (
      <TestProvider params={params}>
        <ControlGeneralViewSelector
          selectors={selectors || [selector, mockSelector2]}
          selector={selector}
          index={0}
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

  it('by default has name and operation fields added', () => {
    const { getByTestId } = render(<WrappedComponent />);

    expect(getByTestId('cloud-defend-selectorcondition-name')).toBeTruthy();
    expect(getByTestId('cloud-defend-selectorcondition-operation')).toBeTruthy();
  });

  it('allows the user to add a limited set of operations', () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);

    userEvent.click(getByTestId('cloud-defend-selectorcondition-operation'));

    getByTestId('comboBoxSearchInput').focus();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe(ControlSelectorOperation.modifyExecutable);
    expect(options[1].textContent).toBe(ControlSelectorOperation.execMemFd);

    userEvent.click(options[1]); // select execMemFd

    const updatedSelector: ControlSelector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(updatedSelector.operation).toContain(ControlSelectorOperation.execMemFd);

    // test that only 1 option is remaining
    const updatedOptions = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(updatedOptions).toHaveLength(1);
    expect(updatedOptions[0].textContent).toBe(ControlSelectorOperation.modifyExecutable);
  });

  it('allows the user add additional conditions', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');

    userEvent.click(addConditionBtn);

    const options = document.querySelectorAll('.euiContextMenuItem');
    expect(options).toHaveLength(Object.values(ControlSelectorCondition).length - 1); // since operation is already present

    await waitFor(() => userEvent.click(options[0])); // add first option "containerImageName"

    // rerender and check that containerImageName is not in the list anymore
    const updatedSelector: ControlSelector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.containerImageName).toHaveLength(0);

    userEvent.click(addConditionBtn);

    const updatedOptions = document.querySelectorAll('.euiContextMenuItem');
    expect(updatedOptions).toHaveLength(Object.values(ControlSelectorCondition).length - 2); // since operation and containerImageName are already selected
    expect(updatedOptions[0]).not.toHaveTextContent('containerImageName');
  });

  it('allows the user add boolean type conditions', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');

    userEvent.click(addConditionBtn);

    const addIgnoreVolumeMounts = getByTestId('cloud-defend-addmenu-ignoreVolumeMounts');

    await waitFor(() => userEvent.click(addIgnoreVolumeMounts));

    const updatedSelector: ControlSelector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.ignoreVolumeMounts).toBeTruthy();
  });

  it('shows an error if no conditions are added', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    userEvent.click(getByTestId('cloud-defend-btnremovecondition-operation'));

    const updatedSelector: ControlSelector = { ...onChange.mock.calls[0][0] };

    rerender(<WrappedComponent selector={updatedSelector} />);

    await waitFor(() => expect(getByText(i18n.errorConditionRequired)).toBeTruthy());

    expect(onChange.mock.calls[0][0]).toHaveProperty('hasErrors');
  });

  it('shows an error if no values provided for condition', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');

    userEvent.click(getByTestId('cloud-defend-btnremovecondition-operation'));
    userEvent.click(addConditionBtn);

    await waitFor(() => userEvent.click(getByText('Container image name'))); // add containerImageName

    expect(onChange.mock.calls).toHaveLength(2);
    expect(onChange.mock.calls[1][0]).toHaveProperty('containerImageName');
    expect(onChange.mock.calls[1][0]).toHaveProperty('hasErrors');
    expect(getByText(i18n.errorValueRequired)).toBeTruthy();
  });

  it('prevents conditions from having values that exceed MAX_CONDITION_VALUE_LENGTH_BYTES', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    userEvent.click(addConditionBtn);

    await waitFor(() => userEvent.click(getByText('Container image name'))); // add containerImageName

    const updatedSelector: ControlSelector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-containerImageName').querySelector(
      'input'
    );

    if (el) {
      userEvent.type(el, new Array(513).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText(i18n.errorValueLengthExceeded)).toBeTruthy();
  });

  it('prevents targetFilePath conditions from having values that exceed MAX_FILE_PATH_VALUE_LENGTH_BYTES', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    userEvent.click(addConditionBtn);

    await waitFor(() => userEvent.click(getByText('Target file path')));

    const updatedSelector: ControlSelector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-targetFilePath').querySelector('input');

    if (el) {
      userEvent.type(el, new Array(257).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText(i18n.errorValueLengthExceeded)).toBeTruthy();
  });

  it('allows the user to remove conditions', async () => {
    const selector: ControlSelector = {
      name: 'mock3',
      operation: [ControlSelectorOperation.createExecutable],
      containerImageTag: ['test'],
    };

    const { getByTestId } = render(<WrappedComponent selector={selector} />);

    userEvent.click(getByTestId('cloud-defend-btnremovecondition-operation'));
    expect(onChange.mock.calls).toHaveLength(1);
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('operation');
  });

  it('allows the user to remove the selector (unless its the last one)', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const btnSelectorPopover = getByTestId('cloud-defend-btnselectorpopover');
    userEvent.click(btnSelectorPopover);

    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btndeleteselector')));

    expect(onRemove.mock.calls).toHaveLength(1);
    expect(onRemove.mock.calls[0][0]).toEqual(0);

    onRemove.mockClear();

    rerender(<WrappedComponent selector={mockSelector} selectors={[mockSelector]} />);

    // try and delete again, and ensure the last selector can't be deleted.
    userEvent.click(btnSelectorPopover);
    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btndeleteselector')));
    expect(onRemove.mock.calls).toHaveLength(0);
  });

  it('allows the user to duplicate the selector', async () => {
    const { getByTestId } = render(<WrappedComponent />);
    const btnSelectorPopover = getByTestId('cloud-defend-btnselectorpopover');
    userEvent.click(btnSelectorPopover);

    await waitFor(() => userEvent.click(getByTestId('cloud-defend-btnduplicateselector')));

    expect(onDuplicate.mock.calls).toHaveLength(1);
    expect(onDuplicate.mock.calls[0][0]).toEqual(mockSelector);
  });
});
