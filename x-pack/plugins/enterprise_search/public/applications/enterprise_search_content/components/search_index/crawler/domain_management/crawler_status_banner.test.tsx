/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { CrawlerStatus } from '../../../../api/crawler/types';

import { CrawlerStatusBanner } from './crawler_status_banner';

describe('CrawlerStatusBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  [(CrawlerStatus.Starting, CrawlerStatus.Running, CrawlerStatus.Canceling)].forEach((status) => {
    describe(`when the status is ${status}`, () => {
      it('renders a callout', () => {
        setMockValues({
          mostRecentCrawlRequestStatus: status,
        });

        const wrapper = shallow(<CrawlerStatusBanner />);

        expect(wrapper.find(EuiCallOut)).toHaveLength(1);
      });
    });
  });

  [
    CrawlerStatus.Success,
    CrawlerStatus.Failed,
    CrawlerStatus.Canceled,
    CrawlerStatus.Pending,
    CrawlerStatus.Suspended,
    CrawlerStatus.Suspending,
  ].forEach((status) => {
    describe(`when the status is ${status}`, () => {
      it('does not render a banner/callout', () => {
        setMockValues({
          mostRecentCrawlRequestStatus: status,
        });

        const wrapper = shallow(<CrawlerStatusBanner />);

        expect(wrapper.isEmptyRender()).toBe(true);
      });
    });
  });
});
