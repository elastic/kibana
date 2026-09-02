/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ALERT_END, ALERT_RULE_TYPE_ID, ALERT_START, ApmRuleType } from '@kbn/rule-data-utils';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { BehaviorSubject } from 'rxjs';
import {
  ANOMALY_TIMESTAMP,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { ServiceFlyoutOptions } from '../../../shared/service_flyout/types';
import type { EmbeddableDeps } from '../../../../embeddable/types';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
import { AlertDetailsServiceMapSection } from '.';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { SERVICE_MAP_EBT_ELEMENTS } from '../../../app/service_map/ebt_constants';

const mockUseApmEmbeddableDeps = jest.fn();

jest.mock('../../context/apm_embeddable_deps_context', () => ({
  useApmEmbeddableDeps: () => mockUseApmEmbeddableDeps(),
}));

jest.mock('../../../../embeddable/embeddable_context', () => ({
  ApmEmbeddableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockServiceMapEmbeddable = jest.fn((_props: unknown) => (
  <div data-test-subj="mockServiceMapEmbeddable" />
));

jest.mock('../../../../embeddable/service_map/service_map_embeddable', () => ({
  ServiceMapEmbeddable: (props: unknown) => mockServiceMapEmbeddable(props as never),
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
  alert: AlertDetailsAppSectionProps['alert'] = makeAlert(),
  ruleParams: Partial<AlertDetailsAppSectionProps['rule']['params']> = {}
): AlertDetailsAppSectionProps {
  return {
    alert,
    rule: {
      params: {
        environment: 'production',
        aggregationType: 'avg',
        windowSize: 1,
        windowUnit: TIME_UNITS.MINUTE,
        ...ruleParams,
      },
    } as AlertDetailsAppSectionProps['rule'],
    timeZone: 'UTC',
    setSources: () => {},
  };
}

function renderComponent(
  alert: AlertDetailsAppSectionProps['alert'] = makeAlert(),
  deps: EmbeddableDeps | null = createMockDeps(),
  ruleParams: Partial<AlertDetailsAppSectionProps['rule']['params']> = {}
) {
  mockUseApmEmbeddableDeps.mockReturnValue(deps);

  return render(
    <EuiProvider>
      <AlertDetailsServiceMapSection {...makeProps(alert, ruleParams)} />
    </EuiProvider>
  );
}

function getEmbeddableFlyoutOptions() {
  expect(mockServiceMapEmbeddable).toHaveBeenCalled();
  const [props] = mockServiceMapEmbeddable.mock.calls.at(-1) as unknown as [
    { flyoutOptions: ServiceFlyoutOptions }
  ];
  return props.flyoutOptions;
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

  it('instruments the Explore in Service map link with EBT click attributes', () => {
    renderComponent();

    const exploreLink = screen.getByTestId('apmAlertDetailsExploreInServiceMap');
    expect(exploreLink).toHaveAttribute('data-ebt-action', APM_EBT_ACTIONS.EXPLORE_SERVICE_MAP);
    expect(exploreLink).toHaveAttribute(
      'data-ebt-element',
      SERVICE_MAP_EBT_ELEMENTS.SECTION_HEADER_LINK
    );
    expect(exploreLink).not.toHaveAttribute('data-ebt-detail');
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

  describe('flyoutOptions', () => {
    const alertStart = '2024-01-15T13:00:00.000Z';
    const alertEnd = '2024-01-15T13:05:00.000Z';

    it('inherits the rule latency aggregation type and the alert transaction fields', () => {
      renderComponent(makeAlert(), createMockDeps(), { aggregationType: '95th' });

      expect(getEmbeddableFlyoutOptions()).toEqual(
        expect.objectContaining({
          latencyAggregationType: LatencyAggregationType.p95,
          transactionType: 'request',
          transactionName: 'GET /api/users',
        })
      );
    });

    it('defaults to average latency when the rule has no aggregation type', () => {
      renderComponent(makeAlert(), createMockDeps(), { aggregationType: undefined });

      expect(getEmbeddableFlyoutOptions().latencyAggregationType).toBe(LatencyAggregationType.avg);
    });

    it('pads the range from the alert start for non-anomaly alerts', () => {
      renderComponent();

      const expected = getPaddedAlertTimeRange(alertStart, alertEnd);
      expect(getEmbeddableFlyoutOptions()).toEqual(
        expect.objectContaining({ rangeFrom: expected.from, rangeTo: expected.to })
      );
    });

    it('anchors the padded range on the anomaly timestamp for anomaly alerts', () => {
      const anomalyTimestamp = '2024-01-15T12:30:00.000Z';
      renderComponent(
        makeAlert({
          [ALERT_RULE_TYPE_ID]: ApmRuleType.Anomaly,
          [ANOMALY_TIMESTAMP]: anomalyTimestamp,
        })
      );

      const expected = getPaddedAlertTimeRange(anomalyTimestamp, alertEnd);
      expect(getEmbeddableFlyoutOptions()).toEqual(
        expect.objectContaining({ rangeFrom: expected.from, rangeTo: expected.to })
      );
    });

    it('ignores the anomaly timestamp for non-anomaly alerts', () => {
      renderComponent(makeAlert({ [ANOMALY_TIMESTAMP]: '2024-01-15T12:30:00.000Z' }));

      const expected = getPaddedAlertTimeRange(alertStart, alertEnd);
      expect(getEmbeddableFlyoutOptions().rangeFrom).toBe(expected.from);
    });
  });
});
