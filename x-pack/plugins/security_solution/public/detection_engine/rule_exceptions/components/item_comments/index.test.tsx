/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiTextArea } from '@elastic/eui';

import { ExceptionItemComments } from '.';
import { TestProviders } from '../../../../common/mock';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { shallow } from 'enzyme';

jest.mock('../../../../common/lib/kibana');

describe('ExceptionItemComments', () => {
  beforeEach(() => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      username: 'user',
      email: 'email',
      fullName: 'full name',
      roles: ['user-role'],
      enabled: true,
      authentication_realm: { name: 'native1', type: 'native' },
      lookup_realm: { name: 'native1', type: 'native' },
      authentication_provider: { type: 'basic', name: 'basic1' },
      authentication_type: 'realm',
      elastic_cloud_user: false,
      metadata: { _reserved: false },
    });
  });

  it('it uses user full_name if one exists', () => {
    const wrapper = shallow(
      <ExceptionItemComments
        newCommentValue={'This is a new comment'}
        newCommentOnChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionItemCommentAvatar"]').prop('name')).toEqual(
      'full name'
    );
  });

  it('it uses user email if fullName is not available', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      username: 'user',
      email: 'email',
      fullName: '',
      roles: ['user-role'],
      enabled: true,
      authentication_realm: { name: 'native1', type: 'native' },
      lookup_realm: { name: 'native1', type: 'native' },
      authentication_provider: { type: 'basic', name: 'basic1' },
      authentication_type: 'realm',
      elastic_cloud_user: false,
      metadata: { _reserved: false },
    });

    const wrapper = shallow(
      <ExceptionItemComments
        newCommentValue={'This is a new comment'}
        newCommentOnChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionItemCommentAvatar"]').prop('name')).toEqual(
      'email'
    );
  });

  it('it uses username if fullName and email are not available', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      username: 'user',
      email: '',
      fullName: '',
      roles: ['user-role'],
      enabled: true,
      authentication_realm: { name: 'native1', type: 'native' },
      lookup_realm: { name: 'native1', type: 'native' },
      authentication_provider: { type: 'basic', name: 'basic1' },
      authentication_type: 'realm',
      elastic_cloud_user: false,
      metadata: { _reserved: false },
    });

    const wrapper = shallow(
      <ExceptionItemComments
        newCommentValue={'This is a new comment'}
        newCommentOnChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionItemCommentAvatar"]').prop('name')).toEqual(
      'user'
    );
  });

  it('it renders new comment', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionItemComments
          newCommentValue={'This is a new comment'}
          newCommentOnChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="newExceptionItemCommentTextArea"]').at(1).props().value
    ).toEqual('This is a new comment');
  });

  it('it calls newCommentOnChange on comment update change', () => {
    const mockOnCommentChange = jest.fn();
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionItemComments
          newCommentValue="This is a new comment"
          newCommentOnChange={mockOnCommentChange}
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
        <ExceptionItemComments
          exceptionItemComments={[
            {
              comment: 'This is an existing comment',
              created_at: '2020-04-20T15:25:31.830Z',
              created_by: 'elastic',
              id: 'uuid_here',
            },
          ]}
          newCommentValue={''}
          newCommentOnChange={mockOnCommentChange}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionItemCommentsAccordion"]').exists()).toBeTruthy();
  });
});
