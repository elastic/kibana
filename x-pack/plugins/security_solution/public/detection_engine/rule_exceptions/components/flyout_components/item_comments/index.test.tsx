/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiTextArea } from '@elastic/eui';

import { ExceptionsFlyoutComments } from '.';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');

describe('ExceptionsFlyoutComments', () => {
  it('it renders new comment', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsFlyoutComments
          newComment={'This is a new comment'}
          onCommentChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionFlyoutCommentAccordion"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  it('it calls onCommentChange on comment update change', () => {
    const mockOnCommentChange = jest.fn();
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsFlyoutComments
          newComment={'This is a new comment'}
          onCommentChange={mockOnCommentChange}
        />
      </TestProviders>
    );

    (
      wrapper.find(EuiTextArea).at(0).props() as unknown as {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      }
    ).onChange({
      target: { value: 'Updating my new comment' },
    } as React.ChangeEvent<HTMLInputElement>);

    expect(mockOnCommentChange).toHaveBeenCalledWith('Updating my new comment');
  });

  it('it renders existing comments if any exist', () => {
    const mockOnCommentChange = jest.fn();
    const wrapper = mountWithIntl(
      <TestProviders>
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
          onCommentChange={mockOnCommentChange}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemComments"]').exists()).toBeTruthy();
  });
});
