/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';

const TEST_ID = 'testid';

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
        <InsightsSummaryPanel data={data} data-test-subj={TEST_ID} />
      </IntlProvider>
    );

    const iconTestId = `${TEST_ID}Icon0`;
    const valueTestId = `${TEST_ID}Value0`;
    const colorTestId = `${TEST_ID}Color0`;
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
        <InsightsSummaryPanel data={data} data-test-subj={TEST_ID} />
      </IntlProvider>
    );

    const valueTestId = `${TEST_ID}Value0`;
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
        <InsightsSummaryPanel data={data} data-test-subj={TEST_ID} />
      </IntlProvider>
    );

    expect(queryByTestId(`${TEST_ID}Color`)).not.toBeInTheDocument();
  });
});
