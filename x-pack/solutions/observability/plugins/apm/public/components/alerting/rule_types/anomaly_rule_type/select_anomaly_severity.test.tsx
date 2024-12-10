/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { SelectAnomalySeverity } from './select_anomaly_severity';

describe('SelectAnomalySeverity', () => {
  it('shows the correct text for each item', async () => {
    const result = render(
      <SelectAnomalySeverity onChange={() => {}} value={ML_ANOMALY_SEVERITY.CRITICAL} />,
      { wrapper: I18nProvider }
    );

    // SR-only text 'Critical, is selected'
    // was removed here: https://github.com/elastic/eui/pull/6630#discussion_r1123655995
    const button = await result.findByText('critical');

    button.click();

    const options = await result.findAllByTestId('SelectAnomalySeverity option text');

    expect(options.map((option) => option?.innerHTML)).toEqual([
      'score critical ', // Trailing space is intentional here, to keep the i18n simple
      'score major and above',
      'score minor and above',
      'score warning and above',
    ]);
  });
});
