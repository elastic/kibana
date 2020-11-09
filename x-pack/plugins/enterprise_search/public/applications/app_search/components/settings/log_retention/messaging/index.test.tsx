/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/kea.mock';
import { setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsLogRetentionMessage, ApiLogRetentionMessage, renderLogRetentionDate } from '.';

describe('LogRetentionMessaging', () => {
  const LOG_RETENTION = {
    analytics: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
    api: {
      disabledAt: null,
      enabled: true,
      retentionPolicy: { isDefault: true, minAgeDays: 180 },
    },
  };

  describe('renderLogRetentionDate', () => {
    it('renders a formatted date', () => {
      expect(renderLogRetentionDate('Thu, 05 Nov 2020 18:57:28 +0000')).toEqual('November 5, 2020');
    });
  });

  describe('AnalyticsLogRetentionMessage', () => {
    it('renders', () => {
      setMockValues({
        ilmEnabled: true,
        logRetention: LOG_RETENTION,
      });
      const wrapper = shallow(<AnalyticsLogRetentionMessage />);
      expect(wrapper.text()).toEqual('Your analytics are being stored for at least 180 days.');
    });

    it('renders nothing if logRetention is null', () => {
      setMockValues({
        ilmEnabled: true,
        logRetention: null,
      });
      const wrapper = shallow(<AnalyticsLogRetentionMessage />);
      expect(wrapper.isEmptyRender()).toEqual(true);
    });
  });

  describe('ApiLogRetentionMessage', () => {
    it('renders', () => {
      setMockValues({
        ilmEnabled: true,
        logRetention: LOG_RETENTION,
      });
      const wrapper = shallow(<ApiLogRetentionMessage />);
      expect(wrapper.text()).toEqual('Your logs are being stored for at least 180 days.');
    });

    it('renders nothing if logRetention is null', () => {
      setMockValues({
        ilmEnabled: true,
        logRetention: null,
      });
      const wrapper = shallow(<ApiLogRetentionMessage />);
      expect(wrapper.isEmptyRender()).toEqual(true);
    });
  });
});
