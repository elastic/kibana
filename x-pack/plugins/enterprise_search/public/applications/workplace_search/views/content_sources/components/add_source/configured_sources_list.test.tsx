/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { mergedConfiguredSources } from '../../../../__mocks__/content_sources.mock';

import { ConfiguredSourcesList } from './configured_sources_list';

describe('ConfiguredSourcesList', () => {
  const props = {
    sources: mergedConfiguredSources,
    isOrganization: true,
  };

  it('renders', () => {
    const wrapper = shallow(<ConfiguredSourcesList {...props} />);

    expect(wrapper.find('[data-test-subj="UnConnectedTooltip"]')).toHaveLength(5);
    expect(wrapper.find('[data-test-subj="AccountOnlyTooltip"]')).toHaveLength(1);
    expect(wrapper.find(EuiPanel)).toHaveLength(6);
  });

  it('handles empty state', () => {
    const wrapper = shallow(<ConfiguredSourcesList sources={[]} isOrganization />);

    expect(wrapper.find('[data-test-subj="ConfiguredSourceEmptyState"]')).toHaveLength(1);
  });
});
