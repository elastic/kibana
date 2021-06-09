/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersForm } from '.';
import { RenderResult, act, render } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { stubIndexPatternWithFields } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { Provider } from 'react-redux';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { ThemeProvider } from 'styled-components';
import { createGlobalNoMiddlewareStore, ecsEventMock } from '../../../test_utils';
import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { NAME_ERROR, NAME_PLACEHOLDER } from './translations';
import { useCurrentUser, useKibana } from '../../../../../../common/lib/kibana';
import { ExceptionBuilder } from '../../../../../../shared_imports';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/containers/source');

const mockTheme = getMockTheme({
  eui: {
    paddingSizes: { m: '2' },
  },
});

describe('Event filter form', () => {
  let component: RenderResult;
  let store: ReturnType<typeof createGlobalNoMiddlewareStore>;

  const renderForm = () => {
    const Wrapper: React.FC = ({ children }) => (
      <Provider store={store}>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </Provider>
    );

    return render(<EventFiltersForm />, { wrapper: Wrapper });
  };

  const renderComponentWithdata = () => {
    const entry = getInitialExceptionFromEvent(ecsEventMock());
    act(() => {
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });
    });
    return renderForm();
  };

  beforeEach(() => {
    const emptyComp = <span data-test-subj="alert-exception-builder" />;
    jest.spyOn(ExceptionBuilder, 'getExceptionBuilderComponentLazy').mockReturnValue(emptyComp);

    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPatternWithFields,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        data: {},
        notifications: {},
      },
    });
    store = createGlobalNoMiddlewareStore();
  });
  it('should renders correctly without data', () => {
    component = renderForm();
    expect(component.getByTestId('loading-spinner')).not.toBeNull();
  });

  it('should renders correctly with data', () => {
    component = renderComponentWithdata();

    expect(component.getByTestId('alert-exception-builder')).not.toBeNull();
  });

  it('should display name error only when on blur and empty name', () => {
    component = renderComponentWithdata();
    expect(component.queryByText(NAME_ERROR)).toBeNull();
    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);
    act(() => {
      fireEvent.blur(nameInput);
    });
    expect(component.queryByText(NAME_ERROR)).not.toBeNull();
  });

  it('should change name', async () => {
    component = renderComponentWithdata();

    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);

    act(() => {
      fireEvent.change(nameInput, {
        target: {
          value: 'Exception name',
        },
      });
    });

    expect(store.getState()!.management!.eventFilters!.form!.entry!.name).toBe('Exception name');
    expect(store.getState()!.management!.eventFilters!.form!.hasNameError).toBeFalsy();
  });

  it('should change name with a white space still shows an error', async () => {
    component = renderComponentWithdata();

    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);

    act(() => {
      fireEvent.change(nameInput, {
        target: {
          value: ' ',
        },
      });
    });

    expect(store.getState()!.management!.eventFilters!.form!.entry!.name).toBe('');
    expect(store.getState()!.management!.eventFilters!.form!.hasNameError).toBeTruthy();
  });

  it('should change comments', async () => {
    component = renderComponentWithdata();

    const commentInput = component.getByPlaceholderText('Add a new comment...');

    act(() => {
      fireEvent.change(commentInput, {
        target: {
          value: 'Exception comment',
        },
      });
    });

    expect(store.getState()!.management!.eventFilters!.form!.newComment).toBe('Exception comment');
  });
});
