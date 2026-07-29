/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ILicense } from '@kbn/licensing-types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { LicenseContext } from '../../../../context/license/license_context';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import type { ContextualServiceMapSectionProps } from './contextual_service_map_section';
import { ContextualServiceMapSection } from './contextual_service_map_section';

jest.mock('../../../../embeddable/service_map/service_map_embeddable', () => ({
  ServiceMapEmbeddable: () => <div data-test-subj="mockServiceMapEmbeddable" />,
}));

const defaultProps: ContextualServiceMapSectionProps = {
  serviceName: 'opbeans-node',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
};

function renderSection(
  props: Partial<ContextualServiceMapSectionProps> = {},
  options: {
    license?: ILicense | undefined;
    serviceMapEnabled?: boolean;
  } = {}
) {
  const license = Object.prototype.hasOwnProperty.call(options, 'license')
    ? options.license
    : licenseMock.createLicense({
        license: { type: 'platinum', mode: 'platinum' },
      });

  const wrapperProps =
    options.serviceMapEnabled === false
      ? { value: { config: { serviceMapEnabled: false } } as ApmPluginContextValue }
      : {};

  return render(
    <MockApmPluginContextWrapper {...wrapperProps}>
      <LicenseContext.Provider value={license}>
        <ContextualServiceMapSection {...defaultProps} {...props} />
      </LicenseContext.Provider>
    </MockApmPluginContextWrapper>
  );
}

describe('ContextualServiceMapSection', () => {
  it('renders the map section when platinum license and service map are available', () => {
    renderSection();

    expect(screen.getByTestId('apmContextualServiceMapSection')).toBeInTheDocument();
    expect(screen.getByText('Service map')).toBeInTheDocument();
    expect(screen.getByTestId('apmContextualServiceMapExploreInServiceMap')).toBeInTheDocument();
    expect(screen.getByTestId('contextualServiceMapControls')).toBeInTheDocument();
    expect(screen.getByTestId('mockServiceMapEmbeddable')).toBeInTheDocument();
  });

  it('renders the license prompt without map controls when license is insufficient', () => {
    renderSection(
      {},
      {
        license: licenseMock.createLicense({
          license: { type: 'basic', mode: 'basic' },
        }),
      }
    );

    expect(screen.getByTestId('apmContextualServiceMapSection')).toBeInTheDocument();
    expect(screen.getByText('Service map')).toBeInTheDocument();
    expect(screen.getByTestId('apmLicensePromptStartTrialButton')).toBeInTheDocument();
    expect(screen.getByText(/Platinum license/)).toBeInTheDocument();
    expect(
      screen.queryByTestId('apmContextualServiceMapExploreInServiceMap')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextualServiceMapControls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceMapEmbeddable')).not.toBeInTheDocument();
  });

  it('renders the disabled prompt when service map is disabled', () => {
    renderSection({}, { serviceMapEnabled: false });

    expect(screen.getByTestId('apmContextualServiceMapSection')).toBeInTheDocument();
    expect(screen.getByText('Service map is disabled')).toBeInTheDocument();
    expect(
      screen.queryByTestId('apmContextualServiceMapExploreInServiceMap')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextualServiceMapControls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceMapEmbeddable')).not.toBeInTheDocument();
  });

  it('returns null when service name is missing', () => {
    renderSection({ serviceName: '' });

    expect(screen.queryByTestId('apmContextualServiceMapSection')).not.toBeInTheDocument();
  });

  it('returns null while license is loading', () => {
    renderSection({}, { license: undefined });

    expect(screen.queryByTestId('apmContextualServiceMapSection')).not.toBeInTheDocument();
  });
});
