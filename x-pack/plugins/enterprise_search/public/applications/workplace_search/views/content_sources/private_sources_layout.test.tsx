/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { AccountHeader } from '../../components/layout';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { SourceSubNav } from './components/source_sub_nav';

import {
  PRIVATE_CAN_CREATE_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_TITLE,
  PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION,
  PRIVATE_CAN_CREATE_PAGE_DESCRIPTION,
} from './constants';
import { PersonalDashboardLayout } from './personal_dashboard_layout';

describe('PersonalDashboardLayout', () => {
  const mockValues = {
    account: { canCreatePersonalSources: true },
  };

  const children = <p data-test-subj="TestChildren">test</p>;

  beforeEach(() => {
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

    expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(1);
    expect(wrapper.find(SourceSubNav)).toHaveLength(1);
    expect(wrapper.find(AccountHeader)).toHaveLength(1);
  });

  it('uses correct title and description when private sources are enabled', () => {
    const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_CAN_CREATE_PAGE_TITLE);
    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
      PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
    );
  });

  it('uses correct title and description when private sources are disabled', () => {
    setMockValues({ account: { canCreatePersonalSources: false } });
    const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(PRIVATE_VIEW_ONLY_PAGE_TITLE);
    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
      PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION
    );
  });

  it('renders callout when in read-only mode', () => {
    const wrapper = shallow(
      <PersonalDashboardLayout readOnlyMode>{children}</PersonalDashboardLayout>
    );

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
