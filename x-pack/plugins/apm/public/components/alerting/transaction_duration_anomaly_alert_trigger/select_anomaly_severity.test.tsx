/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { ANOMALY_SEVERITY } from '../../../../../ml/common';
import { SelectAnomalySeverity } from './select_anomaly_severity';

function Wrapper({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

describe('SelectAnomalySeverity', () => {
  it('shows the correct text for each item', async () => {
    const result = render(
      <SelectAnomalySeverity
        onChange={() => {}}
        value={ANOMALY_SEVERITY.CRITICAL}
      />,
      { wrapper: Wrapper }
    );
    const button = (await result.findAllByText('critical'))[1];

    button.click();

    const options = await result.findAllByTestId(
      'SelectAnomalySeverity option text'
    );

    expect(
      options.map((option) => (option.firstChild as HTMLElement)?.innerHTML)
    ).toEqual([
      'score critical ', // Trailing space is intentional here, to keep the i18n simple
      'score major and above',
      'score minor and above',
      'score warning and above',
    ]);
  });
});
