/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { MisconfigurationsInsight } from './misconfiguration_insight';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');

const fieldName = 'host.name';
const name = 'test host';
const testId = 'test';

const renderMisconfigurationsInsight = () => {
  return render(
    <TestProviders>
      <MisconfigurationsInsight name={name} fieldName={fieldName} data-test-subj={testId} />
    </TestProviders>
  );
};

describe('MisconfigurationsInsight', () => {
  it('renders', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({
      data: { count: { passed: 1, failed: 2 } },
    });
    const { getByTestId } = renderMisconfigurationsInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('renders null if no misconfiguration data found', () => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    const { container } = renderMisconfigurationsInsight();
    expect(container).toBeEmptyDOMElement();
  });
});
