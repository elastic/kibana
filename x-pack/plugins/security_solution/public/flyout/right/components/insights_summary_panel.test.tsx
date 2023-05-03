/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  INSIGHTS_THREAT_INTELLIGENCE_COLOR_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_ICON_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_VALUE_TEST_ID,
} from './test_ids';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';

describe('<SummaryPanel />', () => {
  it('should render by default', () => {
    const data: InsightsSummaryPanelData[] = [
      {
        icon: 'image',
        value: 1,
        text: 'this is a test for red',
        color: 'rgb(189,39,30)',
      },
    ];

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID} />
      </IntlProvider>
    );

    const iconTestId = `${INSIGHTS_THREAT_INTELLIGENCE_ICON_TEST_ID}0`;
    const valueTestId = `${INSIGHTS_THREAT_INTELLIGENCE_VALUE_TEST_ID}0`;
    const colorTestId = `${INSIGHTS_THREAT_INTELLIGENCE_COLOR_TEST_ID}0`;
    expect(getByTestId(iconTestId)).toBeInTheDocument();
    expect(getByTestId(valueTestId)).toHaveTextContent('1 this is a test for red');
    expect(getByTestId(colorTestId)).toBeInTheDocument();
  });

  it('should only render null when data is null', () => {
    const data = null as unknown as InsightsSummaryPanelData[];

    const { container } = render(<InsightsSummaryPanel data={data} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should handle big number in a compact notation', () => {
    const data: InsightsSummaryPanelData[] = [
      {
        icon: 'image',
        value: 160000,
        text: 'this is a test for red',
        color: 'rgb(189,39,30)',
      },
    ];

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID} />
      </IntlProvider>
    );

    const valueTestId = `${INSIGHTS_THREAT_INTELLIGENCE_VALUE_TEST_ID}0`;
    expect(getByTestId(valueTestId)).toHaveTextContent('160k this is a test for red');
  });

  it(`should not show the colored dot if color isn't provided`, () => {
    const data: InsightsSummaryPanelData[] = [
      {
        icon: 'image',
        value: 160000,
        text: 'this is a test for no color',
      },
    ];

    const { queryByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID} />
      </IntlProvider>
    );

    expect(queryByTestId(INSIGHTS_THREAT_INTELLIGENCE_COLOR_TEST_ID)).not.toBeInTheDocument();
  });
});
