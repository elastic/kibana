/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../../../__mocks__/kea_logic';
import { mergedAvailableSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiToolTip, EuiTitle } from '@elastic/eui';

import { AvailableSourcesList } from './available_sources_list';

describe('AvailableSourcesList', () => {
  beforeEach(() => {
    setMockValues({ hasPlatinumLicense: true });
  });

  it('renders', () => {
    const wrapper = shallow(<AvailableSourcesList sources={mergedAvailableSources} />);

    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="AvailableSourceListItem"]')).toHaveLength(24);
    expect(wrapper.find('[data-test-subj="CustomAPISourceLink"]')).toHaveLength(1);
  });

  it('handles disabled federated sources for platinum licenses', () => {
    setMockValues({ hasPlatinumLicense: false });
    const wrapper = shallow(<AvailableSourcesList sources={mergedAvailableSources} />);

    expect(wrapper.find(EuiToolTip)).toHaveLength(2);
  });

  it('handles empty state', () => {
    const wrapper = shallow(<AvailableSourcesList sources={[]} />);

    expect(wrapper.find('[data-test-subj="AvailableSourceEmptyState"]')).toHaveLength(1);
  });
});
