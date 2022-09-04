/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiTextArea } from '@elastic/eui';

import { ExceptionsFlyoutComments } from './exception_flyout_comments';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';

jest.mock('../../../lib/kibana');

const mockTheme = getMockTheme({
  eui: {
    euiBreakpoints: {
      l: '1200px',
    },
    euiSizeM: '10px',
    euiBorderThin: '1px solid #ece',
  },
});

describe('ExceptionsFlyoutComments', () => {
  it('it renders new comment', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsFlyoutComments newComment={'This is a new comment'} dispatch={jest.fn()} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  it('it calls dispatch on comment update change', () => {
    const mockDispatch = jest.fn();
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsFlyoutComments newComment={'This is a new comment'} dispatch={mockDispatch} />
      </ThemeProvider>
    );

    (
      wrapper.find(EuiTextArea).at(0).props() as unknown as {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      }
    ).onChange({
      target: { value: 'Updating my new comment' },
    } as React.ChangeEvent<HTMLInputElement>);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'setComment',
      comment: 'Updating my new comment',
    });
  });

  it('it renders existing comments if any exist', () => {
    const mockDispatch = jest.fn();
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsFlyoutComments
          existingComments={[
            {
              comment: 'This is an existing comment',
              created_at: '2020-04-20T15:25:31.830Z',
              created_by: 'elastic',
              id: 'uuid_here',
            },
          ]}
          newComment={''}
          dispatch={mockDispatch}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="addExceptionCommentsAccordion"]').exists()).toBeTruthy();
  });
});