/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: removed dependencies on UrlGetSearch

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { useParams } from 'react-router-dom';
import copy from 'copy-to-clipboard';

import { TestProviders } from '../../common/mock';
import { UserActionCopyLink } from './user_action_copy_link';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
  };
});

jest.mock('copy-to-clipboard', () => jest.fn());

const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string; absolute?: boolean }) =>
    `${appId}${options?.path ?? ''}`
);

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
    },
  }),
}));

const props = {
  id: 'comment-id',
  getCaseDetailHrefWithCommentId: jest.fn().mockReturnValue('random-url'),
};

describe('UserActionCopyLink ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({ detailName: 'case-1' });
    wrapper = mount(<UserActionCopyLink {...props} />, { wrappingComponent: TestProviders });
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
  });

  it('calls copy clipboard correctly', async () => {
    wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().simulate('click');
    expect(copy).toHaveBeenCalledWith('random-url');
  });
});
