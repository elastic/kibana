/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
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
    jest.useFakeTimers();
    onChange.mockClear();
    onRemove.mockClear();
    onDuplicate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
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
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByTestId, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-selectorcondition-operation'));
    await showEuiComboBoxOptions();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(4);
    expect(options[0].textContent).toBe('modifyExecutable');
    expect(options[1].textContent).toBe('createFile');
    expect(options[2].textContent).toBe('modifyFile');
    expect(options[3].textContent).toBe('deleteFile');

    await user.click(options[3]); // select deleteFile

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
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByTestId, rerender } = render(<WrappedComponent selector={mockProcessSelector2} />);

    await user.click(getByTestId('cloud-defend-selectorcondition-operation'));
    await showEuiComboBoxOptions();

    const options = getByTestId(
      'comboBoxOptionsList cloud-defend-selectorcondition-operation-optionsList'
    ).querySelectorAll('.euiComboBoxOption__content');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe('fork');
    expect(options[1].textContent).toBe('exec');

    await user.click(options[1]); // select exec

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
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByTestId, rerender } = render(<WrappedComponent />);

    const addConditionBtn = getByTestId('cloud-defend-btnaddselectorcondition');
    await user.click(addConditionBtn);

    const options = document.querySelectorAll('.euiContextMenuItem');
    const conditions = getSelectorConditions('file');
    expect(options).toHaveLength(conditions.length - 1); // -1 since operation is already present

    await user.click(options[1]); // add second option "containerImageName"

    // rerender and check that containerImageName is not in the list anymore
    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.containerImageName).toHaveLength(0);

    await user.click(addConditionBtn);

    const updatedOptions = document.querySelectorAll('.euiContextMenuItem');
    expect(updatedOptions).toHaveLength(conditions.length - 2); // since operation and containerImageName are already selected
    expect(updatedOptions[0]).not.toHaveTextContent('containerImageName');
  });

  it('allows the user add boolean type conditions', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByTestId, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByTestId('cloud-defend-addmenu-ignoreVolumeMounts'));

    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(updatedSelector.ignoreVolumeMounts).toBeTruthy();
  });

  it('shows an error if no conditions are added', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnremovecondition-operation'));

    const updatedSelector: Selector = { ...onChange.mock.calls[0][0] };

    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(getByText(i18n.errorConditionRequired)).toBeTruthy();

    expect(onChange.mock.calls[0][0]).toHaveProperty('hasErrors');
  });

  it('shows an error if no values provided for condition', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnremovecondition-operation'));
    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Container image name')); // add containerImageName

    expect(onChange.mock.calls).toHaveLength(2);
    expect(onChange.mock.calls[1][0]).toHaveProperty('containerImageName');
    expect(onChange.mock.calls[1][0]).toHaveProperty('hasErrors');
    expect(getByText(i18n.errorValueRequired)).toBeTruthy();
  });

  it('prevents conditions from having values that exceed MAX_CONDITION_VALUE_LENGTH_BYTES', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Container image name')); // add containerImageName

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-containerImageName')).getByTestId(
      'comboBoxSearchInput'
    );

    if (el) {
      await user.click(el);
      // using paste instead of type here because typing 513 chars is too slow and causes a timeout.
      await user.paste(new Array(513).join('a'));
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"containerImageName" values cannot exceed 511 bytes')).toBeTruthy();
  });

  it('prevents targetFilePath conditions from having values that exceed MAX_FILE_PATH_VALUE_LENGTH_BYTES', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);
    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Target file path'));

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-targetFilePath')).getByTestId(
      'comboBoxSearchInput'
    );

    if (el) {
      await user.click(el);
      // using paste instead of type here because typing 257 chars is too slow and causes a timeout.
      await user.paste(new Array(257).join('a'));
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"targetFilePath" values cannot exceed 255 bytes')).toBeInTheDocument();
  });

  it('validates targetFilePath conditions values', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, queryByText, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Target file path'));

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-targetFilePath')).getByTestId(
      'comboBoxSearchInput'
    );

    const errorStr = i18n.errorInvalidTargetFilePath;

    if (el) {
      await user.clear(el);
      await user.paste('/usr/bin/**');
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(queryByText(errorStr)).not.toBeInTheDocument();

    await user.type(el, '/*{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(queryByText(errorStr)).not.toBeInTheDocument();

    await user.type(el, 'badpath{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText(errorStr)).toBeInTheDocument();

    await user.type(el, ' {enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText('"targetFilePath" values cannot be empty')).toBeInTheDocument();
  });

  it('validates processExecutable conditions values', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, queryByText, rerender } = render(
      <WrappedComponent selector={mockProcessSelector} />
    );

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Process executable'));

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-processExecutable')).getByTestId(
      'comboBoxSearchInput'
    );

    const regexError = i18n.errorInvalidProcessExecutable;

    if (el) {
      await user.clear(el);
      await user.paste('/usr/bin/**');
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(queryByText(regexError)).not.toBeInTheDocument();

    await user.clear(el);
    await user.paste('/*');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(queryByText(regexError)).not.toBeInTheDocument();

    await user.clear(el);
    await user.paste('/usr/bin/ls');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    expect(updatedSelector.hasErrors).toBeFalsy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(queryByText(regexError)).not.toBeInTheDocument();

    await user.clear(el);
    await user.paste('badpath');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText(regexError)).toBeInTheDocument();

    await user.type(el, ' {enter}');
    updatedSelector = onChange.mock.calls[4][0];
    expect(updatedSelector.hasErrors).toBeTruthy();
    rerender(<WrappedComponent selector={updatedSelector} />);
    expect(getByText('"processExecutable" values cannot be empty')).toBeInTheDocument();
  });

  it('validates containerImageFullName conditions values', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, queryByText, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Container image full name'));

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(
      getByTestId('cloud-defend-selectorcondition-containerImageFullName')
    ).getByTestId('comboBoxSearchInput');

    const regexError = i18n.errorInvalidFullContainerImageName;

    if (el) {
      await user.clear(el);
      await user.paste('docker.io/nginx');
      await user.type(el, '{enter}');

      await user.clear(el);
      await user.paste('docker.io/nginx-dev');
      await user.type(el, '{enter}');

      await user.clear(el);
      await user.paste('docker.io/nginx.dev');
      await user.type(el, '{enter}');

      await user.clear(el);
      await user.paste('docker.io/nginx_dev');
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(queryByText(regexError)).not.toBeInTheDocument();

    await user.clear(el);
    await user.paste('nginx');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[5][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(getByText(regexError)).toBeInTheDocument();
  });

  it('validates kubernetesPodLabel conditions values', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, queryByText, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Kubernetes pod label'));

    let updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-kubernetesPodLabel')).getByTestId(
      'comboBoxSearchInput'
    );

    const errorStr = i18n.errorInvalidPodLabel;

    if (el) {
      await user.clear(el);
      await user.paste('key1:value1');
      await user.type(el, '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    updatedSelector = onChange.mock.calls[1][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(queryByText(errorStr)).not.toBeInTheDocument();

    await user.clear(el);
    await user.paste('key1:value*');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[2][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    await user.clear(el);
    await user.paste('key1*:value');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[3][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    await user.clear(el);
    await user.type(el, '{backspace}');
    await user.paste('key1');
    await user.type(el, '{enter}');
    updatedSelector = onChange.mock.calls[5][0];
    rerender(<WrappedComponent selector={updatedSelector} />);

    expect(getByText(errorStr)).toBeTruthy();
  });

  it('prevents processName conditions from having values that exceed 15 bytes', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, rerender } = render(
      <WrappedComponent selector={mockProcessSelector} />
    );

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Process name'));

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-processName')).getByTestId(
      'comboBoxSearchInput'
    );

    if (el) {
      await user.type(el, new Array(17).join('a') + '{enter}');
    } else {
      throw new Error("Can't find input");
    }

    expect(getByText('"processName" values cannot exceed 15 bytes')).toBeInTheDocument();
  });

  it('shows an error if condition values fail their pattern regex', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, rerender } = render(<WrappedComponent />);

    await user.click(getByTestId('cloud-defend-btnaddselectorcondition'));
    await user.click(getByText('Container image name')); // add containerImageName

    const updatedSelector: Selector = onChange.mock.calls[0][0];

    rerender(<WrappedComponent selector={updatedSelector} />);

    const el = within(getByTestId('cloud-defend-selectorcondition-containerImageName')).getByTestId(
      'comboBoxSearchInput'
    );

    if (el) {
      await user.type(el, 'bad*imagename{enter}');
    } else {
      throw new Error("Can't find input");
    }

    const expectedError =
      '"containerImageName" values must match the pattern: /^([a-z0-9]+(?:[._-][a-z0-9]+)*)$/';

    expect(getByText(expectedError)).toBeTruthy();
  });

  it('allows the user to remove conditions', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    const selector: Selector = {
      type: 'file',
      name: 'mock3',
      operation: ['createExecutable'],
      containerImageTag: ['test'],
    };

    const { getByTestId } = render(<WrappedComponent selector={selector} />);

    await user.click(getByTestId('cloud-defend-btnremovecondition-operation'));
    expect(onChange.mock.calls).toHaveLength(1);
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('operation');
  });

  it('allows the user to remove the selector (unless its the last one)', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    const { getByTestId, rerender } = render(<WrappedComponent />);

    const btnSelectorPopover = getByTestId('cloud-defend-btnselectorpopover');
    await user.click(btnSelectorPopover);

    await user.click(getByTestId('cloud-defend-btndeleteselector'));

    expect(onRemove.mock.calls).toHaveLength(1);
    expect(onRemove.mock.calls[0][0]).toEqual(0);

    onRemove.mockClear();

    rerender(<WrappedComponent selector={mockFileSelector} selectors={[mockFileSelector]} />);

    // try and delete again, and ensure the last selector can't be deleted.
    await user.click(btnSelectorPopover);
    await user.click(getByTestId('cloud-defend-btndeleteselector'));
    expect(onRemove.mock.calls).toHaveLength(0);
  });

  it('allows the user to expand/collapse selector', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
    const { getByText, getByTestId, queryByTestId } = render(<WrappedComponent />);
    const selector = getByTestId('cloud-defend-selector');

    // should start as closed.
    // there are two mock selectors, and the last one will auto open
    expect(
      await within(selector).findAllByRole('button', {
        expanded: false,
      })
    ).toHaveLength(2);
    expect(
      within(selector).queryByRole('button', {
        expanded: true,
      })
    ).not.toBeInTheDocument();

    const count = getByTestId('cloud-defend-conditions-count');
    expect(count).toBeTruthy();
    expect(count).toHaveTextContent('1');
    expect(count.title).toEqual('operation');

    const title = getByText(mockFileSelector.name);
    await user.click(title);

    expect(
      within(selector).queryByRole('button', {
        expanded: false,
      })
    ).not.toBeInTheDocument();
    expect(
      await within(selector).findAllByRole('button', {
        expanded: true,
      })
    ).toHaveLength(2);

    expect(queryByTestId('cloud-defend-conditions-count')).not.toBeInTheDocument();
  });
});
