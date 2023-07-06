/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IToasts } from '@kbn/core/public';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextAreaWithAutocomplete } from './text_area_with_autocomplete';
import { useKibana } from '../../common/lib/kibana';

const Providers = ({ children }: { children: any }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: Providers });
};

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Autocomplete component tests', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  const defaultMessageVariables = [
    {
      description: 'The action group of the alert that scheduled actions for the rule.',
      name: 'alert.actionGroup',
    },
    { description: 'The ID of the alert that scheduled actions for the rule.', name: 'alert.id' },
    {
      description: 'List of tags associated with the entity where this alert triggered.',
      name: 'context.tags',
    },
  ];
  beforeAll(() => {
    useKibanaMock().services.notifications.toasts = {
      addSuccess,
      addError,
    } as unknown as IToasts;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render modal text area with autocomplete', async () => {
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue="default message"
        isDisabled={false}
        editAction={() => {}}
        label="Message"
        errors={[]}
      />
    );

    expect(await screen.findByText('default message')).toBeVisible();
    expect(await screen.findByText('Message')).toBeVisible();
  });

  it('open selectable component if write {{ in text area', async () => {
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue="default message"
        isDisabled={false}
        editAction={() => {}}
        label="Message"
        errors={[]}
      />
    );

    expect(screen.queryByTestId('euiSelectableList')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: '{{' },
    });
    expect(screen.getByTestId('euiSelectableList')).toBeVisible();
  });

  it('type a word in textarea after click on it', async () => {
    const editAction = jest.fn(() => {});
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue=""
        isDisabled={false}
        editAction={editAction}
        label="Message"
        errors={[]}
      />
    );

    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: '{{' },
    });
    expect(screen.getByText('alert.actionGroup')).toBeVisible();
    fireEvent.click(screen.getByTestId('alert.actionGroup-selectableOption'));
    expect(editAction).toBeCalledWith('message', '{{alert.actionGroup}}', 0);
  });

  it('selectable component disappeared if click on textarea', async () => {
    const editAction = jest.fn(() => {});
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue=""
        isDisabled={false}
        editAction={editAction}
        label="Message"
        errors={[]}
      />
    );

    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: '{{aler' },
    });
    expect(screen.getByTestId('euiSelectableList')).toBeVisible();
    fireEvent.click(screen.getByTestId('messageTextArea'));
    expect(screen.queryByTestId('euiSelectableList')).not.toBeInTheDocument();
  });

  it('do not have "context.tags" in selectable list', async () => {
    const editAction = jest.fn(() => {});
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue=""
        isDisabled={false}
        editAction={editAction}
        label="Message"
        errors={[]}
      />
    );

    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: '{{alert' },
    });
    expect(screen.getByTestId('euiSelectableList')).toBeVisible();
    screen.getByTestId('alert.actionGroup-selectableOption');
    expect(screen.queryByText('context.tags')).not.toBeInTheDocument();
  });

  it('can go down to selectable component if press keydown', async () => {
    const spy = jest.spyOn(React, 'useRef');

    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        inputTargetValue="default message"
        isDisabled={false}
        editAction={() => {}}
        label="Message"
        errors={[]}
      />
    );

    screen.getByTestId('messageTextArea').focus();
    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: '{{' },
    });

    // Obtain a reference to EuiSelectable by spying on React.useRef
    const refToEuiSelectable = spy.mock.results
      .map((res) => res.value.current)
      .find((element) => element.onFocus);
    refToEuiSelectable.onFocus = jest.fn(); // mock the onFocus

    fireEvent.keyDown(screen.getByTestId('messageTextArea'), { code: 'ArrowDown' });
    expect(refToEuiSelectable.onFocus).toBeCalled();
  });
});
