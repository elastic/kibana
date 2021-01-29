/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceNodeMetrics } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { RouteComponentProps } from 'react-router-dom';

describe('ServiceNodeMetrics', () => {
  describe('render', () => {
    it('renders', () => {
      const props = ({} as unknown) as RouteComponentProps<{
        serviceName: string;
        serviceNodeName: string;
      }>;

      expect(() =>
        shallow(
          <MockApmPluginContextWrapper>
            <ServiceNodeMetrics {...props} />
          </MockApmPluginContextWrapper>
        )
      ).not.toThrowError();
    });
  });
});
