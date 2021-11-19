/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCodeBlock, EuiFlyout } from '@elastic/eui';

import { Loading } from '../../../../shared/loading';

import { CrawlDetailValues } from '../crawl_detail_logic';
import { CrawlerStatus } from '../types';

import { CrawlDetailsFlyout } from './crawl_details_flyout';

const MOCK_VALUES: CrawlDetailValues = {
  dataLoading: false,
  flyoutHidden: false,
  request: {
    id: '654364aed23623456',
    status: CrawlerStatus.Pending,
    createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
    beganAt: null,
    completedAt: null,
  },
};

describe('CrawlDetailsFlyout', () => {
  it('renders a flyout containing the raw json of the crawl details', () => {
    setMockValues(MOCK_VALUES);

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.is(EuiFlyout)).toBe(true);
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
  });

  it('renders a loading screen when loading', () => {
    setMockValues({ ...MOCK_VALUES, dataLoading: true });

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.is(EuiFlyout)).toBe(true);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('is empty when the flyout is hidden', () => {
    setMockValues({
      flyoutHidden: true,
    });

    const wrapper = shallow(<CrawlDetailsFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
