/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from '../../../constants';
import { SourceSubNav } from '../../../views/content_sources/components/source_sub_nav';

import { ViewContentHeader } from '../../shared/view_content_header';

import { PrivateSourcesSidebar } from './private_sources_sidebar';

describe('PrivateSourcesSidebar', () => {
  const mockValues = {
    account: { canCreatePersonalSources: true },
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<PrivateSourcesSidebar />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(SourceSubNav)).toHaveLength(1);
  });

  it('uses correct title and description when private sources are enabled', () => {
    const wrapper = shallow(<PrivateSourcesSidebar />);

    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_CAN_CREATE_PAGE_TITLE);
    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
      PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
    );
  });

  it('uses correct title and description when private sources are disabled', () => {
    setMockValues({ account: { canCreatePersonalSources: false } });
    const wrapper = shallow(<PrivateSourcesSidebar />);

    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_VIEW_ONLY_PAGE_TITLE);
    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
      PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION
    );
  });
});
