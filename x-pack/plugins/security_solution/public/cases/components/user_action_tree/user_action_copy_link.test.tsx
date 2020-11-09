/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { useParams } from 'react-router-dom';
import copy from 'copy-to-clipboard';

import { TestProviders } from '../../../common/mock';
import { UserActionCopyLink } from './user_action_copy_link';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';

const searchURL =
  '?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
  };
});

jest.mock('copy-to-clipboard', () => {
  return jest.fn();
});

jest.mock('../../../common/components/navigation/use_get_url_search');

const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string; absolute?: boolean }) =>
    `${appId}${options?.path ?? ''}`
);

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        application: {
          getUrlForApp: mockGetUrlForApp,
        },
      },
    }),
  };
});

const props = {
  id: 'comment-id',
};

describe('UserActionCopyLink ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({ detailName: 'case-1' });
    (useGetUrlSearch as jest.Mock).mockReturnValue(searchURL);
    wrapper = mount(<UserActionCopyLink {...props} />, { wrappingComponent: TestProviders });
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
  });

  it('calls copy clipboard correctly', async () => {
    wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().simulate('click');
    expect(copy).toHaveBeenCalledWith(
      'securitySolution:case/case-1/comment-id?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))'
    );
  });
});
