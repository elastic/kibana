/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kea.mock';
import '../../__mocks__/shallow_useeffect.mock';
import { mockHttpValues } from '../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { JSON_HEADER as headers } from '../../../../common/constants';

import {
  sendTelemetry,
  SendEnterpriseSearchTelemetry,
  SendAppSearchTelemetry,
  SendWorkplaceSearchTelemetry,
} from './';

describe('Shared Telemetry Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTelemetry', () => {
    it('successfully calls the server-side telemetry endpoint', () => {
      sendTelemetry({
        http: mockHttpValues.http,
        product: 'enterprise_search',
        action: 'viewed',
        metric: 'setup_guide',
      });

      expect(mockHttpValues.http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"enterprise_search","action":"viewed","metric":"setup_guide"}',
      });
    });

    it('throws an error if the telemetry endpoint fails', () => {
      const httpRejectMock = sendTelemetry({
        http: { put: () => Promise.reject() },
      } as any);

      expect(httpRejectMock).rejects.toThrow('Unable to send telemetry');
    });
  });

  describe('React component helpers', () => {
    it('SendEnterpriseSearchTelemetry component', () => {
      shallow(<SendEnterpriseSearchTelemetry action="viewed" metric="page" />);

      expect(mockHttpValues.http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"enterprise_search","action":"viewed","metric":"page"}',
      });
    });

    it('SendAppSearchTelemetry component', () => {
      shallow(<SendAppSearchTelemetry action="clicked" metric="button" />);

      expect(mockHttpValues.http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"app_search","action":"clicked","metric":"button"}',
      });
    });

    it('SendWorkplaceSearchTelemetry component', () => {
      shallow(<SendWorkplaceSearchTelemetry action="error" metric="not_found" />);

      expect(mockHttpValues.http.put).toHaveBeenCalledWith('/api/enterprise_search/stats', {
        headers,
        body: '{"product":"workplace_search","action":"error","metric":"not_found"}',
      });
    });
  });
});
