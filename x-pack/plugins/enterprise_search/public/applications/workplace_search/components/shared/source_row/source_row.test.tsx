/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTableRow, EuiSwitch, EuiIcon } from '@elastic/eui';

import { SourceIcon } from '../source_icon';

import { SourceRow } from '.';

const onToggle = jest.fn();

describe('SourceRow', () => {
  it('renders with no "Fix" link', () => {
    const wrapper = shallow(<SourceRow source={contentSources[0]} />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
    expect(wrapper.contains('Fix')).toBeFalsy();
    expect(wrapper.find(SourceIcon).prop('serviceType')).toEqual('custom');
  });

  it('calls handler on click', () => {
    const wrapper = shallow(<SourceRow onSearchableToggle={onToggle} source={contentSources[0]} />);
    wrapper.find(EuiSwitch).simulate('change', { target: { checked: true } });

    expect(onToggle).toHaveBeenCalled();
  });

  it('renders "Re-authenticate" link', () => {
    const source = {
      ...contentSources[0],
      status: 'error',
      errorReason: 'OAuth access token could not be refreshed',
      activities: [
        {
          status: 'error',
          details: [],
          event: '',
          time: '',
        },
      ],
    };
    const wrapper = shallow(<SourceRow isOrganization source={source} />);

    expect(wrapper.contains('Re-authenticate')).toBeTruthy();
  });

  it('renders loading icon when indexing', () => {
    const source = {
      ...contentSources[0],
      status: 'indexing',
    };
    const wrapper = shallow(<SourceRow isOrganization source={source} />);

    expect(wrapper.find(SourceIcon).prop('serviceType')).toEqual('loadingSmall');
  });

  it('renders warning dot when more config needed', () => {
    const source = {
      ...contentSources[0],
      status: 'need-more-config',
    };
    const wrapper = shallow(<SourceRow isOrganization source={source} />);

    expect(wrapper.find(EuiIcon).prop('color')).toEqual('warning');
  });

  it('renders remote tooltip when source is federated', () => {
    const source = {
      ...contentSources[0],
      isFederatedSource: true,
    };
    const wrapper = shallow(<SourceRow isOrganization source={source} />);

    expect(wrapper.find('[data-test-subj="SourceDocumentCount"]').contains('Remote')).toBeTruthy();
  });

  it('renders details link', () => {
    const wrapper = shallow(<SourceRow isOrganization showDetails source={contentSources[0]} />);

    expect(wrapper.find('[data-test-subj="SourceDetailsLink"]')).toHaveLength(1);
  });
});
