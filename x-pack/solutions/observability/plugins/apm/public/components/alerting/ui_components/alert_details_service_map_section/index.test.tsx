/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { BehaviorSubject } from 'rxjs';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import type { EmbeddableDeps } from '../../../../embeddable/types';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
import { AlertDetailsServiceMapSection } from '.';

const mockUseApmEmbeddableDeps = jest.fn();

jest.mock('../../context/apm_embeddable_deps_context', () => ({
  useApmEmbeddableDeps: () => mockUseApmEmbeddableDeps(),
}));

jest.mock('../../../../embeddable/embeddable_context', () => ({
  ApmEmbeddableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../../embeddable/service_map/service_map_embeddable', () => ({
  ServiceMapEmbeddable: () => <div data-test-subj="mockServiceMapEmbeddable" />,
}));

jest.mock('../../../../embeddable/service_map/get_service_map_url', () => ({
  getServiceMapUrl: jest.fn(() => '/app/apm/service-map'),
}));

function makeAlert(
  fields: Partial<AlertDetailsAppSectionProps['alert']['fields']> = {}
): AlertDetailsAppSectionProps['alert'] {
  return {
    fields: {
      [ALERT_START]: '2024-01-15T13:00:00.000Z',
      [ALERT_END]: '2024-01-15T13:05:00.000Z',
      [SERVICE_NAME]: 'opbeans-node',
      [SERVICE_ENVIRONMENT]: 'production',
      [TRANSACTION_TYPE]: 'request',
      [TRANSACTION_NAME]: 'GET /api/users',
      ...fields,
    },
  } as unknown as AlertDetailsAppSectionProps['alert'];
}

function createMockDeps(
  options: {
    license?: ReturnType<typeof licenseMock.createLicense>;
    serviceMapEnabled?: boolean;
  } = {}
): EmbeddableDeps {
  const license =
    options.license ??
    licenseMock.createLicense({
      license: { type: 'platinum', mode: 'platinum' },
    });

  return {
    coreStart: {
      http: { basePath: { prepend: (path: string) => path } },
    },
    pluginsStart: {
      licensing: {
        license$: new BehaviorSubject(license),
      },
    },
    config: { serviceMapEnabled: options.serviceMapEnabled ?? true },
  } as unknown as EmbeddableDeps;
}

function makeProps(
  alert: AlertDetailsAppSectionProps['alert'] = makeAlert()
): AlertDetailsAppSectionProps {
  return {
    alert,
    rule: {
      params: {
        environment: 'production',
        aggregationType: 'avg',
        windowSize: 1,
        windowUnit: TIME_UNITS.MINUTE,
      },
    } as AlertDetailsAppSectionProps['rule'],
    timeZone: 'UTC',
    setSources: () => {},
  };
}

function renderComponent(
  alert: AlertDetailsAppSectionProps['alert'] = makeAlert(),
  deps: EmbeddableDeps | null = createMockDeps()
) {
  mockUseApmEmbeddableDeps.mockReturnValue(deps);

  return render(
    <EuiProvider>
      <AlertDetailsServiceMapSection {...makeProps(alert)} />
    </EuiProvider>
  );
}

describe('AlertDetailsServiceMapSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section when platinum license and service map are available', () => {
    renderComponent();

    expect(screen.getByTestId('apmAlertDetailsServiceMapSection')).toBeInTheDocument();
    expect(screen.getByText('Service map preview')).toBeInTheDocument();
    expect(screen.getByTestId('apmAlertDetailsExploreInServiceMap')).toBeInTheDocument();
    expect(screen.getByTestId('apmAlertDetailsServiceMapFilters')).toBeInTheDocument();
    expect(screen.getByTestId('mockServiceMapEmbeddable')).toBeInTheDocument();
  });

  it('hides the section without a platinum license', () => {
    renderComponent(
      makeAlert(),
      createMockDeps({
        license: licenseMock.createLicense({
          license: { type: 'basic', mode: 'basic' },
        }),
      })
    );

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceMapEmbeddable')).not.toBeInTheDocument();
  });

  it('hides the section when the license is inactive', () => {
    renderComponent(
      makeAlert(),
      createMockDeps({
        license: licenseMock.createLicense({
          license: { type: 'platinum', mode: 'platinum', status: 'expired' },
        }),
      })
    );

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
  });

  it('hides the section when service map is disabled', () => {
    renderComponent(makeAlert(), createMockDeps({ serviceMapEnabled: false }));

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
  });

  it('hides the section when embeddable deps are unavailable', () => {
    renderComponent(makeAlert(), null);

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
  });

  it('hides the section when service name is missing', () => {
    renderComponent(makeAlert({ [SERVICE_NAME]: undefined }));

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
  });

  it('hides the section when alert start time is missing', () => {
    renderComponent(makeAlert({ [ALERT_START]: undefined }));

    expect(screen.queryByTestId('apmAlertDetailsServiceMapSection')).not.toBeInTheDocument();
  });
});
