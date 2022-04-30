/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import * as stories from './analyze_data_button.stories';

const { Example } = composeStories(stories);

describe('AnalyzeDataButton', () => {
  describe('with a non-RUM and non-mobile agent', () => {
    it('renders nothing', () => {
      render(<Example agentName="java" />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('with no dashboard show capabilities', () => {
    it('renders nothing', () => {
      render(<Example canShowDashboard={false} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('with a RUM agent', () => {
    it('uses a ux dataType', () => {
      render(<Example agentName="rum-js" />);

      expect((screen.getByRole('link') as HTMLAnchorElement).href).toEqual(
        'http://localhost/app/observability/exploratory-view/#?reportType=kpi-over-time&sr=!((dt:ux,mt:transaction.duration.us,n:testServiceName-response-latency,op:average,rdf:(service.environment:!(testEnvironment),service.name:!(testServiceName)),time:(from:now-15m,to:now)))'
      );
    });
  });

  describe('with a mobile agent', () => {
    it('uses a mobile dataType', () => {
      render(<Example agentName="iOS/swift" />);

      expect((screen.getByRole('link') as HTMLAnchorElement).href).toEqual(
        'http://localhost/app/observability/exploratory-view/#?reportType=kpi-over-time&sr=!((dt:mobile,mt:transaction.duration.us,n:testServiceName-response-latency,op:average,rdf:(service.environment:!(testEnvironment),service.name:!(testServiceName)),time:(from:now-15m,to:now)))'
      );
    });
  });

  describe('with environment not defined', () => {
    it('does not include the environment', () => {
      render(<Example environment={ENVIRONMENT_NOT_DEFINED.value} />);

      expect((screen.getByRole('link') as HTMLAnchorElement).href).toEqual(
        'http://localhost/app/observability/exploratory-view/#?reportType=kpi-over-time&sr=!((dt:mobile,mt:transaction.duration.us,n:testServiceName-response-latency,op:average,rdf:(service.environment:!(ENVIRONMENT_NOT_DEFINED),service.name:!(testServiceName)),time:(from:now-15m,to:now)))'
      );
    });
  });

  describe('with environment all', () => {
    it('uses ALL_VALUES', () => {
      render(<Example environment={ENVIRONMENT_ALL.value} />);

      expect((screen.getByRole('link') as HTMLAnchorElement).href).toEqual(
        'http://localhost/app/observability/exploratory-view/#?reportType=kpi-over-time&sr=!((dt:mobile,mt:transaction.duration.us,n:testServiceName-response-latency,op:average,rdf:(service.environment:!(ALL_VALUES),service.name:!(testServiceName)),time:(from:now-15m,to:now)))'
      );
    });
  });
});
