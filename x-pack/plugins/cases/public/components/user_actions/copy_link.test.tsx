/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import copy from 'copy-to-clipboard';

import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { UserActionCopyLink } from './copy_link';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('../../common/navigation/hooks');
jest.mock('copy-to-clipboard', () => jest.fn());
jest.mock('../../common/lib/kibana');

const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string; absolute?: boolean }) =>
    `${appId}${options?.path ?? ''}`
);

const props = {
  id: 'comment-id',
};

describe('UserActionCopyLink ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionCopyLink {...props} />, { wrappingComponent: TestProviders });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.getUrlForApp = mockGetUrlForApp;
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
  });

  it('calls copy clipboard correctly', async () => {
    wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().simulate('click');
    expect(copy).toHaveBeenCalledWith('/app/security/cases/test');
  });
});
