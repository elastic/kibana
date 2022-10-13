/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

jest.mock('../../../views/content_sources/components/source_sub_nav', () => ({
  useSourceSubNav: () => [],
}));

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSideNav } from '@elastic/eui';

import {
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from '../../../constants';

import { ViewContentHeader } from '../../shared/view_content_header';

import { PrivateSourcesSidebar } from './private_sources_sidebar';

describe('PrivateSourcesSidebar', () => {
  const mockValues = {
    account: { canCreatePrivateSources: true },
    contentSource: {},
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<PrivateSourcesSidebar />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
  });

  describe('header text', () => {
    it('uses correct title and description when private sources are enabled', () => {
      const wrapper = shallow(<PrivateSourcesSidebar />);

      expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_CAN_CREATE_PAGE_TITLE);
      expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
        PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
      );
    });

    it('uses correct title and description when private sources are disabled', () => {
      setMockValues({ ...mockValues, account: { canCreatePrivateSources: false } });
      const wrapper = shallow(<PrivateSourcesSidebar />);

      expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_VIEW_ONLY_PAGE_TITLE);
      expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
        PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION
      );
    });
  });

  describe('sub nav', () => {
    it('renders a side nav when viewing a single source', () => {
      setMockValues({ ...mockValues, contentSource: { id: '1', name: 'test source' } });
      const wrapper = shallow(<PrivateSourcesSidebar />);

      expect(wrapper.find(EuiSideNav)).toHaveLength(1);
    });

    it('does not render a side nav if not on a source page', () => {
      setMockValues({ ...mockValues, contentSource: {} });
      const wrapper = shallow(<PrivateSourcesSidebar />);

      expect(wrapper.find(EuiSideNav)).toHaveLength(0);
    });
  });
});
