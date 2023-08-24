/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { InsightsSummaryRow } from './insights_summary_row';

const testId = 'test';
const iconTestId = `${testId}Icon`;
const valueTestId = `${testId}Value`;
const colorTestId = `${testId}Color`;
const loadingTestId = `${testId}Loading`;

describe('<InsightsSummaryRow />', () => {
  it('should render by default', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryRow
          icon={'image'}
          value={1}
          text={'this is a test for red'}
          color={'rgb(189,39,30)'}
          data-test-subj={testId}
        />
      </IntlProvider>
    );

    expect(getByTestId(iconTestId)).toBeInTheDocument();
    expect(getByTestId(valueTestId)).toHaveTextContent('1 this is a test for red');
    expect(getByTestId(colorTestId)).toBeInTheDocument();
  });

  it('should render loading skeletton if loading is true', () => {
    const { getByTestId } = render(
      <InsightsSummaryRow loading={true} icon={'image'} text={'text'} data-test-subj={testId} />
    );

    expect(getByTestId(loadingTestId)).toBeInTheDocument();
  });

  it('should only render null when error is true', () => {
    const { container } = render(<InsightsSummaryRow error={true} icon={'image'} text={'text'} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should handle big number in a compact notation', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryRow
          icon={'image'}
          value={160000}
          text={'this is a test for red'}
          color={'rgb(189,39,30)'}
          data-test-subj={testId}
        />
      </IntlProvider>
    );

    expect(getByTestId(valueTestId)).toHaveTextContent('160k this is a test for red');
  });

  it(`should not show the colored dot if color isn't provided`, () => {
    const { queryByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryRow
          icon={'image'}
          value={160000}
          text={'this is a test for no color'}
          data-test-subj={testId}
        />
      </IntlProvider>
    );

    expect(queryByTestId(colorTestId)).not.toBeInTheDocument();
  });
});
