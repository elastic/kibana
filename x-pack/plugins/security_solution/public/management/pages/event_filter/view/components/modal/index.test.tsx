/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFilterModal } from '.';
import { RenderResult, act, render } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Ecs } from '../../../../../../../common/ecs';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { createGlobalNoMiddlewareStore } from '../../../test_utils';
import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { MODAL_TITLE, MODAL_SUBTITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '../../../../../../../public/shared_imports';

jest.mock('../form');
jest.mock('../notification');

const event: Ecs = {
  _id: 'unLfz3gB2mJZsMY3ytx3',
  timestamp: '2021-04-14T15:34:15.330Z',
  _index: '.ds-logs-endpoint.events.process-default-2021.04.12-000001',
  event: {
    category: ['network'],
    id: ['2c4f51be-7736-4ab8-a255-54e7023c4653'],
    kind: ['event'],
    type: ['start'],
  },
  host: {
    name: ['Host-tvs68wo3qc'],
    os: {
      family: ['windows'],
    },
    id: ['a563b365-2bee-40df-adcd-ae84d889f523'],
    ip: ['10.242.233.187'],
  },
  user: {
    name: ['uegem17ws4'],
    domain: ['hr8jofpkxp'],
  },
  agent: {
    type: ['endpoint'],
  },
  process: {
    hash: {
      md5: ['c4653870-99b8-4f36-abde-24812d08a289'],
    },
    parent: {
      pid: [4852],
    },
    pid: [3652],
    name: ['lsass.exe'],
    args: ['"C:\\lsass.exe" \\6z9'],
    entity_id: ['9qotd1i8rf'],
    executable: ['C:\\lsass.exe'],
  },
};

const mockTheme = getMockTheme({
  eui: {
    paddingSizes: { m: '2' },
    euiBreakpoints: { l: '2' },
  },
});

describe('Event filter modal', () => {
  let component: RenderResult;
  let store: ReturnType<typeof createGlobalNoMiddlewareStore>;
  let onCancelMock: jest.Mock;

  const renderForm = () => {
    const Wrapper: React.FC = ({ children }) => (
      <Provider store={store}>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </Provider>
    );

    return render(<EventFilterModal data={event} onCancel={onCancelMock} />, { wrapper: Wrapper });
  };

  beforeEach(() => {
    store = createGlobalNoMiddlewareStore();
    onCancelMock = jest.fn();
  });

  it('should renders correctly', () => {
    component = renderForm();
    component.getAllByText(MODAL_TITLE);
    component.getByText(MODAL_SUBTITLE);
    component.getAllByText(ACTIONS_CONFIRM);
    component.getByText(ACTIONS_CANCEL);
  });

  it('should dispatch action to init form store on mount', () => {
    component = renderForm();
    expect(store.getState()!.management!.eventFilter!.form!.entry).not.toBeNull();
  });

  it('should confirm form when button is disabled', () => {
    component = renderForm();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(store.getState()!.management!.eventFilter!.form!.submissionResourceState.type).toBe(
      'UninitialisedResourceState'
    );
  });

  it('should confirm form when button is enabled', () => {
    component = renderForm();
    store.dispatch({
      type: 'eventFilterChangeForm',
      payload: {
        entry: {
          ...(store.getState()!.management!.eventFilter!.form!
            .entry as CreateExceptionListItemSchema),
          name: 'test',
        },
        hasNameError: false,
      },
    });
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(store.getState()!.management!.eventFilter!.form!.submissionResourceState.type).toBe(
      'LoadingResourceState'
    );
  });

  it('should close when exception has been submitted correctly', () => {
    component = renderForm();
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      store.dispatch({
        type: 'eventFilterFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: store.getState()!.management!.eventFilter!.form!.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when click on cancel button', () => {
    component = renderForm();
    const cancelButton = component.getByText(ACTIONS_CANCEL);
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when close modal', () => {
    component = renderForm();
    const modalCloseButton = component.getByLabelText('Closes this modal window');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(modalCloseButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when is loading action', () => {
    component = renderForm();
    act(() => {
      store.dispatch({
        type: 'eventFilterFormStateChanged',
        payload: {
          type: 'LoadingResourceState',
          previousState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    const cancelButton = component.getByText(ACTIONS_CANCEL);
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });
});
