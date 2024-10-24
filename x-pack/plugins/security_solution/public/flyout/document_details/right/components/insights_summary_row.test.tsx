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
const textTestId = `${testId}Text`;
const valueTestId = `${testId}Value`;
const loadingTestId = `${testId}Loading`;

describe('<InsightsSummaryRow />', () => {
  it('should render by default', () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <InsightsSummaryRow
          text={'this is a test for red'}
          value={<div>{'value for this'}</div>}
          color={'rgb(189,39,30)'}
          data-test-subj={testId}
        />
      </IntlProvider>
    );

    expect(getByTestId(textTestId)).toHaveTextContent('this is a test for red');
    expect(getByTestId(valueTestId)).toHaveTextContent('value for this');
  });

  it('should render loading skeletton if loading is true', () => {
    const { getByTestId } = render(
      <InsightsSummaryRow
        loading={true}
        text={'text'}
        value={<div>{'value for this'}</div>}
        data-test-subj={testId}
      />
    );

    expect(getByTestId(loadingTestId)).toBeInTheDocument();
  });

  it('should only render null when error is true', () => {
    const { container } = render(
      <InsightsSummaryRow error={true} text={'text'} value={<div>{'value for this'}</div>} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
