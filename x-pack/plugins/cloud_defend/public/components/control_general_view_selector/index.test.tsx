/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, render, waitFor, fireEvent } from '@testing-library/react';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import { ControlGeneralViewSelector } from '.';
import { Selector } from '../../../common';
import { getSelectorConditions } from '../../common/utils';
import * as i18n from '../control_general_view/translations';

describe('<ControlGeneralViewSelector />', () => {
  const onChange = jest.fn();
  const onRemove = jest.fn();
  const onDuplicate = jest.fn();

  // defining this here to avoid a warning in testprovider with params.history changing on rerender.
  const params = coreMock.createAppMountParameters();

  const mockFileSelector: Selector = {
    type: 'file',
    name: 'mockFile',
    operation: ['createExecutable'],
  };

  const mockFileSelector2: Selector = {
    type: 'file',
    name: 'mockFile2',
    operation: ['createExecutable', 'modifyExecutable'],
  };

  const mockProcessSelector: Selector = {
    type: 'process',
    name: 'mockProcess',
    operation: ['exec'],
  };

  const mockProcessSelector2: Selector = {
    type: 'process',
    name: 'mockProcess2',
    operation: [],
  };

  const WrappedComponent = ({
    selector = { ...mockFileSelector },
    selectors,
  }: {
    selector?: Selector;
    selectors?: Selector[];
  }) => {
    return (
      <TestProvider params={params}>
        <ControlGeneralViewSelector
          selectors={selectors || [selector, { ...mockFileSelector2 }]}
          selector={selector}
          index={0}
          onChange={onChange}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          usedByResponse={false}
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

  it('allows the user to change a selector name', () => {
    const { getByTestId } = render(<WrappedComponent />);

    const input = getByTestId('cloud-defend-selectorcondition-name');
    input.focus();

    fireEvent.change(input, { target: { value: 'newName' } });

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    expect(updatedSelector.name).toEqual('newName');
  });

  it('renders a badge to show that the selector is unused', () => {
    const { getByText } = render(<WrappedComponent />);

    expect(getByText(i18n.unusedSelector)).toBeTruthy();
  });

  it('allows the user to add a limited set of file operations', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);

    getByTestId('cloud-defend-selectorcondition-operation').click();
    await showEuiComboBoxOptions();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(4);
    expect(options[0].textContent).toBe('modifyExecutable');
    expect(options[1].textContent).toBe('createFile');
    expect(options[2].textContent).toBe('modifyFile');
    expect(options[3].textContent).toBe('deleteFile');

    act(() => {
      userEvent.click(options[3]); // select deleteFile
    });

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(updatedSelector.operation).toContain('deleteFile');

    // test that only 3 option is remaining
    const updatedOptions = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(updatedOptions).toHaveLength(3);
  });

  it('allows the user to add a limited set of process operations', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent selector={mockProcessSelector2} />);

    getByTestId('cloud-defend-selectorcondition-operation').click();
    await showEuiComboBoxOptions();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe('fork');
    expect(options[1].textContent).toBe('exec');

    act(() => {
      userEvent.click(options[1]); // select exec
    });

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(updatedSelector.operation).toContain('exec');

    // test that only 1 option is remaining
    const updatedOptions = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(updatedOptions).toHaveLength(1);
  });

  it('allows the user add additional conditions', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    const options = document.querySelectorAll('.euiContextMenuItem');
    const conditions = getSelectorConditions('file');
    expect(options).toHaveLength(conditions.length - 1); // -1 since operation is already present

    await waitFor(() => userEvent.click(options[1])); // add second option "containerImageName"

    // rerender and check that containerImageName is not in the list anymore
    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.containerImageName).toHaveLength(0);

    addConditionBtn.click();

    const updatedOptions = document.querySelectorAll('.euiContextMenuItem');
    expect(updatedOptions).toHaveLength(conditions.length - 2); // since operation and containerImageName are already selected
    expect(updatedOptions[0]).not.toHaveTextContent('containerImageName');
  });

  it('allows the user add boolean type conditions', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');

    addConditionBtn.click();

    const addIgnoreVolumeMounts = getByTestId('cloud-defend-addmenu-ignoreVolumeMounts');

    await waitFor(() => addIgnoreVolumeMounts.click());

    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.ignoreVolumeMounts).toBeTruthy();
  });

  it('shows an error if no conditions are added', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    getByTestId('cloud-defend-btnremovecondition-operation').click();

    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };

    rerender(<WrappedComponent selector={updatedSelector} />);

    await waitFor(() => expect(getByText(i18n.errorConditionRequired)).toBeTruthy());

    expect(onChange.mock.calls[0][0]).toHaveProperty('hasErrors');
  });

  it('shows an error if no values provided for condition', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');

    getByTestId('cloud-defend-btnremovecondition-operation').click();
    addConditionBtn.click();

    await waitFor(() => getByText('Container image name').click()); // add containerImageName

    expect(onChange.mock.calls).toHaveLength(2);
    expect(onChange.mock.calls[1][0]).toHaveProperty('containerImageName');
    expect(onChange.mock.calls[1][0]).toHaveProperty('hasErrors');
    expect(getByText(i18n.errorValueRequired)).toBeTruthy();
  });

  it('prevents conditions from having values that exceed MAX_CONDITION_VALUE_LENGTH_BYTES', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Container image name').click()); // add containerImageName

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-containerImageName').querySelector(
      'input'
    );

    if (el) {
      userEvent.type(el, new Array(513).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"containerImageName" values cannot exceed 511 bytes')).toBeTruthy();
  });

  it('prevents targetFilePath conditions from having values that exceed MAX_FILE_PATH_VALUE_LENGTH_BYTES', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Target file path').click());

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-targetFilePath').querySelector('input');

    if (el) {
      userEvent.type(el, new Array(257).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"targetFilePath" values cannot exceed 255 bytes')).toBeTruthy();
  });

  it('validates targetFilePath conditions values', async () => {
    const { findByText, getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Target file path').click());

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-targetFilePath').querySelector('input');

    const errorStr = i18n.errorInvalidTargetFilePath;

    if (el) {
      userEvent.type(el, '/usr/bin/**{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(findByText(errorStr)).toMatchObject({});

    userEvent.type(el, '/*{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(findByText(errorStr)).toMatchObject({});

    userEvent.type(el, 'badpath{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText(errorStr)).toBeTruthy();

    userEvent.type(el, ' {enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText('"targetFilePath" values cannot be empty')).toBeTruthy();
  });

  it('validates processExecutable conditions values', async () => {
    const { findByText, getByText, getByTestId, rerender } = render(
      <WrappedComponent selector={mockProcessSelector} />
    );

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Process executable').click());

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-processExecutable').querySelector(
      'input'
    );

    const regexError = i18n.errorInvalidProcessExecutable;

    if (el) {
      userEvent.type(el, '/usr/bin/**{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(findByText(regexError)).toMatchObject({});

    userEvent.type(el, '/*{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(findByText(regexError)).toMatchObject({});

    userEvent.type(el, '/usr/bin/ls{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(findByText(regexError)).toMatchObject({});

    userEvent.type(el, 'badpath{enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText(regexError)).toBeTruthy();

    userEvent.type(el, ' {enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText('"processExecutable" values cannot be empty')).toBeTruthy();
  });

  it('validates containerImageFullName conditions values', async () => {
    const { findByText, getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Container image full name').click());

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-containerImageFullName').querySelector(
      'input'
    );

    const regexError = i18n.errorInvalidFullContainerImageName;

    if (el) {
      userEvent.type(el, 'docker.io/nginx{enter}');
      userEvent.type(el, 'docker.io/nginx-dev{enter}');
      userEvent.type(el, 'docker.io/nginx.dev{enter}');
      userEvent.type(el, '127.0.0.1:8080/nginx_dev{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(findByText(regexError)).toMatchObject({});

    userEvent.type(el, 'nginx{enter}');
    updatedSelector = onChange.mock.calls[5][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(getByText(regexError)).toBeTruthy();
  });

  it('validates kubernetesPodLabel conditions values', async () => {
    const { findByText, getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Kubernetes pod label').click());

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-kubernetesPodLabel').querySelector(
      'input'
    );

    const errorStr = i18n.errorInvalidPodLabel;

    if (el) {
      userEvent.type(el, 'key1:value1{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(findByText(errorStr)).toMatchObject({});

    userEvent.type(el, 'key1:value*{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    userEvent.type(el, 'key1*:value{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    userEvent.type(el, '{backspace}key1{enter}');
    updatedSelector = onChange.mock.calls[5][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(getByText(errorStr)).toBeTruthy();
  });

  it('prevents processName conditions from having values that exceed 15 bytes', async () => {
    const { getByText, getByTestId, rerender } = render(
      <WrappedComponent selector={mockProcessSelector} />
    );

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Process name').click());

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-processName').querySelector('input');

    if (el) {
      userEvent.type(el, new Array(17).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"processName" values cannot exceed 15 bytes')).toBeTruthy();
  });

  it('shows an error if condition values fail their pattern regex', async () => {
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    addConditionBtn.click();

    await waitFor(() => getByText('Container image name').click()); // add containerImageName

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = getByTestId('cloud-defend-selectorcondition-containerImageName').querySelector(
      'input'
    );

    if (el) {
      userEvent.type(el, 'bad*imagename{enter}');
    } else {
      throw new Error("Can't find input");
    }

    const expectedError =
      '"containerImageName" values must match the pattern: /^([a-z0-9]+(?:[._-][a-z0-9]+)*)$/';

    expect(getByText(expectedError)).toBeTruthy();
  });

  it('allows the user to remove conditions', async () => {
    const selector: Selector = {
      type: 'file',
      name: 'mock3',
      operation: ['createExecutable'],
      containerImageTag: ['test'],
    };

    const { getByTestId } = render(<WrappedComponent selector={selector} />);

    getByTestId('cloud-defend-btnremovecondition-operation').click();
    expect(onChange.mock.calls).toHaveLength(1);
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('operation');
  });

  it('allows the user to remove the selector (unless its the last one)', async () => {
    const { getByTestId, rerender } = render(<WrappedComponent />);
    const btnSelectorPopover = getByTestId('cloud-defend-btnselectorpopover');
    btnSelectorPopover.click();

    await waitFor(() => getByTestId('cloud-defend-btndeleteselector').click());

    expect(onRemove.mock.calls).toHaveLength(1);
    expect(onRemove.mock.calls[0][0]).toEqual(0);

    onRemove.mockClear();

    rerender(<WrappedComponent selector={mockFileSelector} selectors={[mockFileSelector]} />);

    // try and delete again, and ensure the last selector can't be deleted.
    btnSelectorPopover.click();
    await waitFor(() => getByTestId('cloud-defend-btndeleteselector').click());
    expect(onRemove.mock.calls).toHaveLength(0);
  });

  it('allows the user to expand/collapse selector', async () => {
    const { getByText, getByTestId, findByTestId } = render(<WrappedComponent />);
    const title = getByText(mockFileSelector.name);
    const selector = getByTestId('cloud-defend-selector');

    // should start as closed.
    // there are two mock selectors, and the last one will auto open
    expect(selector.querySelector('.euiAccordion-isOpen')).toBeFalsy();

    const count = getByTestId('cloud-defend-conditions-count');
    expect(count).toBeTruthy();
    expect(count).toHaveTextContent('1');
    expect(count.title).toEqual('operation');

    act(() => title.click());

    waitFor(() => expect(selector.querySelector('.euiAccordion-isOpen')).toBeTruthy());

    const noCount = findByTestId('cloud-defend-conditions-count');
    expect(noCount).toMatchObject({});
  });
});
