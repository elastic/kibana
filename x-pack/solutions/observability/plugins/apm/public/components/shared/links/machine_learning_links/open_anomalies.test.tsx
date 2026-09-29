/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { OpenAnomalies } from './open_anomalies';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';

const mockUseApmServiceContext = vi.fn();
vi.mock('../../../../context/apm_service/use_apm_service_context', () => {
      const mocked = {
      useApmServiceContext: () => mockUseApmServiceContext(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseAnyOfApmParams = vi.fn();
vi.mock('../../../../hooks/use_apm_params', () => {
      const mocked = {
      useAnyOfApmParams: () => mockUseAnyOfApmParams(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseShouldShowAnomalyUi = vi.fn();
vi.mock('../../../../hooks/use_should_show_anomaly_ui', () => {
      const mocked = {
      useShouldShowAnomalyUi: () => mockUseShouldShowAnomalyUi(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./mlsingle_metric_link', () => {
      const mocked = {
      MLSingleMetricLink: ({
        children,
        jobId,
        detectorIndex,
      }: {
        children: React.ReactNode;
        jobId: string;
        detectorIndex?: number;
        serviceName?: string;
        transactionType?: string;
      }) => (
        <a
          data-test-subj="apmMLSingleMetricLinkLink"
          href={`/ml/${jobId}${detectorIndex !== undefined ? `?detectorIndex=${detectorIndex}` : ''}`}
        >
          {children}
        </a>
      ),
    };
      return { ...mocked, default: mocked };
    });

describe('OpenAnomalies', () => {
  beforeEach(() => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName: 'my-service',
      transactionType: 'request',
    });
    mockUseAnyOfApmParams.mockReturnValue({ query: { kuery: '' } });
    mockUseShouldShowAnomalyUi.mockReturnValue(true);
  });

  it('does not render when shouldShowAnomalyUi is false', () => {
    mockUseShouldShowAnomalyUi.mockReturnValue(false);
    const { container } = render(
      <OpenAnomalies detectorType={AnomalyDetectorType.txLatency} mlJobId="job" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when a kuery is set', () => {
    mockUseAnyOfApmParams.mockReturnValue({ query: { kuery: 'service.name: test' } });
    const { container } = render(
      <OpenAnomalies detectorType={AnomalyDetectorType.txLatency} mlJobId="job" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when mlJobId is not provided', () => {
    const { container } = render(
      <OpenAnomalies detectorType={AnomalyDetectorType.txLatency} mlJobId={undefined} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a link to ML with accessible name and custom data-test-subj wrapper', () => {
    render(
      <OpenAnomalies
        detectorType={AnomalyDetectorType.txThroughput}
        mlJobId="job-id"
        dataTestSubj="testOpenAnomalies"
      />
    );

    const wrapper = screen.getByTestId('testOpenAnomalies');
    const link = within(wrapper).getByRole('link', { name: 'Open Anomalies' });
    expect(link).toHaveAttribute('href', '/ml/job-id?detectorIndex=1');
  });
});
