/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: removed dependencies on UrlGetSearch

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import copy from 'copy-to-clipboard';

import { TestProviders } from '../../common/mock';
import { UserActionCopyLink } from './user_action_copy_link';

jest.mock('../../common/navigation/hooks');
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
};

describe('UserActionCopyLink ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionCopyLink {...props} />, { wrappingComponent: TestProviders });
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
  });

  it('calls copy clipboard correctly', async () => {
    wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().simulate('click');
    expect(copy).toHaveBeenCalledWith('/app/security/cases/test');
  });
});
