/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/kea.mock';
import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../../__mocks__';

import { mergedAvailableSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiCard, EuiToolTip, EuiTitle } from '@elastic/eui';

import { AvailableSourcesList } from './available_sources_list';

describe('AvailableSourcesList', () => {
  beforeEach(() => {
    setMockValues({ hasPlatinumLicense: true });
  });

  it('renders', () => {
    const wrapper = shallow(<AvailableSourcesList sources={mergedAvailableSources} />);

    expect(wrapper.find(EuiCard)).toHaveLength(11);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="CustomAPISourceLink"]')).toHaveLength(1);
  });

  it('handles disabled federated sources for platinum licenses', () => {
    setMockValues({ hasPlatinumLicense: false });
    const wrapper = shallow(<AvailableSourcesList sources={mergedAvailableSources} />);

    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
  });

  it('handles empty state', () => {
    const wrapper = shallow(<AvailableSourcesList sources={[]} />);

    expect(wrapper.find('[data-test-subj="AvailableSourceEmptyState"]')).toHaveLength(1);
  });
});
