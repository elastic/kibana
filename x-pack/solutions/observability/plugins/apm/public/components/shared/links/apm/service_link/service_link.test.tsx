/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ServiceLink } from '.';
import * as useApmRouterModule from '../../../../../hooks/use_apm_router';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { OTHER_SERVICE_NAME } from '../max_groups_message';

const query = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  serviceGroup: '',
  comparisonEnabled: false,
} as any;

describe('ServiceLink', () => {
  const mockLink = jest.fn();

  beforeEach(() => {
    mockLink.mockClear();
    jest.spyOn(useApmRouterModule, 'useApmRouter').mockReturnValue({ link: mockLink } as any);
  });

  it('links to service details', () => {
    mockLink.mockReturnValue('/basepath/app/apm/services/opbeans-java/overview');

    render(<ServiceLink agentName="java" serviceName="opbeans-java" query={query} />);

    expect(screen.getByTestId('serviceLink_java')).toHaveAttribute(
      'href',
      '/basepath/app/apm/services/opbeans-java/overview'
    );
    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/overview', {
      path: { serviceName: 'opbeans-java' },
      query,
    });
  });

  it('links to mobile service details', () => {
    mockLink
      .mockReturnValueOnce('/basepath/app/apm/mobile-services/opbeans-android/overview')
      .mockReturnValueOnce('/basepath/app/apm/mobile-services/opbeans-swift/overview');

    render(<ServiceLink agentName="android/java" serviceName="opbeans-android" query={query} />);
    render(<ServiceLink agentName="iOS/swift" serviceName="opbeans-swift" query={query} />);

    expect(screen.getByTestId('serviceLink_android/java')).toHaveAttribute(
      'href',
      '/basepath/app/apm/mobile-services/opbeans-android/overview'
    );
    expect(screen.getByTestId('serviceLink_iOS/swift')).toHaveAttribute(
      'href',
      '/basepath/app/apm/mobile-services/opbeans-swift/overview'
    );
    expect(mockLink).toHaveBeenCalledWith('/mobile-services/{serviceName}/overview', {
      path: { serviceName: 'opbeans-android' },
      query,
    });
    expect(mockLink).toHaveBeenCalledWith('/mobile-services/{serviceName}/overview', {
      path: { serviceName: 'opbeans-swift' },
      query,
    });
  });

  it('shows the service overflow count and services docs link in the remaining-services popover', async () => {
    render(
      <MockApmPluginContextWrapper>
        <ServiceLink serviceName={OTHER_SERVICE_NAME} serviceOverflowCount={47} query={query} />
      </MockApmPluginContextWrapper>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Number of services instrumented has reached the current capacity',
      })
    );

    expect(await screen.findByText(/47 additional services are not shown/i)).toBeInTheDocument();
    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyServices
    );
    expect(mockLink).not.toHaveBeenCalled();
  });
});
