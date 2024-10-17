/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { VulnerabilitiesInsight } from './vulnerabilities_insight';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

const hostName = 'test host';
const testId = 'test';

const renderVulnerabilitiesInsight = () => {
  return render(
    <TestProviders>
      <VulnerabilitiesInsight hostName={hostName} data-test-subj={testId} />
    </TestProviders>
  );
};

describe('VulnerabilitiesInsight', () => {
  it('renders', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
      data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
    });

    const { getByTestId } = renderVulnerabilitiesInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('renders null when data is not available', () => {
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({});

    const { container } = renderVulnerabilitiesInsight();
    expect(container).toBeEmptyDOMElement();
  });
});
