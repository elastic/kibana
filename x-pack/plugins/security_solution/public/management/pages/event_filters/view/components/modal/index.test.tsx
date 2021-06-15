/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersModal } from '.';
import { RenderResult, act, render } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { createGlobalNoMiddlewareStore, ecsEventMock } from '../../../test_utils';
import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { MODAL_TITLE, MODAL_SUBTITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

jest.mock('../form');
jest.mock('../../hooks', () => {
  const originalModule = jest.requireActual('../../hooks');
  const useEventFiltersNotification = jest.fn().mockImplementation(() => {});

  return {
    ...originalModule,
    useEventFiltersNotification,
  };
});

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

    return render(<EventFiltersModal data={ecsEventMock()} onCancel={onCancelMock} />, {
      wrapper: Wrapper,
    });
  };

  beforeEach(() => {
    store = createGlobalNoMiddlewareStore();
    onCancelMock = jest.fn();
  });

  it('should renders correctly', () => {
    component = renderForm();
    expect(component.getAllByText(MODAL_TITLE)).not.toBeNull();
    expect(component.getByText(MODAL_SUBTITLE)).not.toBeNull();
    expect(component.getAllByText(ACTIONS_CONFIRM)).not.toBeNull();
    expect(component.getByText(ACTIONS_CANCEL)).not.toBeNull();
  });

  it('should dispatch action to init form store on mount', () => {
    component = renderForm();
    expect(store.getState()!.management!.eventFilters!.form!.entry).not.toBeNull();
  });

  it('should confirm form when button is disabled', () => {
    component = renderForm();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(store.getState()!.management!.eventFilters!.form!.submissionResourceState.type).toBe(
      'UninitialisedResourceState'
    );
  });

  it('should confirm form when button is enabled', () => {
    component = renderForm();
    store.dispatch({
      type: 'eventFiltersChangeForm',
      payload: {
        entry: {
          ...(store.getState()!.management!.eventFilters!.form!
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
    expect(store.getState()!.management!.eventFilters!.form!.submissionResourceState.type).toBe(
      'UninitialisedResourceState'
    );
    expect(confirmButton.hasAttribute('disabled')).toBeFalsy();
  });

  it('should close when exception has been submitted correctly', () => {
    component = renderForm();
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: store.getState()!.management!.eventFilters!.form!.entry as ExceptionListItemSchema,
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
        type: 'eventFiltersFormStateChanged',
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
