/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFilteringForm } from '.';
import { RenderResult, act, render, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { stubIndexPatternWithFields } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { Ecs } from '../../../../../../../common/ecs';
import { Provider } from 'react-redux';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { ThemeProvider } from 'styled-components';
import { createGlobalNoMiddlewareStore } from '../../../test_utils';
import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { NAME_ERROR, NAME_PLACEHOLDER } from './translations';
import { useCurrentUser, useKibana } from '../../../../../../common/lib/kibana';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/containers/source');

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
  },
});

describe('Event filtering form', () => {
  let component: RenderResult;
  let store: ReturnType<typeof createGlobalNoMiddlewareStore>;

  const renderForm = () => {
    const Wrapper: React.FC = ({ children }) => (
      <Provider store={store}>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </Provider>
    );

    return render(<EventFilteringForm />, { wrapper: Wrapper });
  };

  const renderComponentWithdata = () => {
    const entry = getInitialExceptionFromEvent(event);
    act(() => {
      store.dispatch({
        type: 'eventFilterInitForm',
        payload: { entry },
      });
    });
    return renderForm();
  };

  beforeEach(() => {
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
    component.getByTestId('loading-spinner');
  });

  it('should renders correctly with data', () => {
    component = renderComponentWithdata();

    component.getByText(event.process!.executable![0]);
    component.getByText(NAME_ERROR);
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

    expect(store.getState()!.management!.eventFilter!.form!.entry!.name).toBe('Exception name');
    expect(store.getState()!.management!.eventFilter!.form!.hasNameError).toBeFalsy();
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

    expect(store.getState()!.management!.eventFilter!.form!.entry!.comments![0].comment).toBe(
      'Exception comment'
    );
  });
});
