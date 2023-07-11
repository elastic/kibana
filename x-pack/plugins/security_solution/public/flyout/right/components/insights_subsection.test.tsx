/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InsightsSubSection } from './insights_subsection';

const title = 'Title';
const dataTestSubj = 'test';
const children = <div>{'hello'}</div>;

describe('<InsightsSubSection />', () => {
  it('should render children component', () => {
    const { getByTestId } = render(
      <InsightsSubSection title={title} data-test-subj={dataTestSubj}>
        {children}
      </InsightsSubSection>
    );

    const titleDataTestSubj = `${dataTestSubj}Title`;
    const contentDataTestSubj = `${dataTestSubj}Content`;

    expect(getByTestId(titleDataTestSubj)).toHaveTextContent(title);
    expect(getByTestId(contentDataTestSubj)).toBeInTheDocument();
  });

  it('should render loading component', () => {
    const { getByTestId } = render(
      <InsightsSubSection loading={true} title={title} data-test-subj={dataTestSubj}>
        {children}
      </InsightsSubSection>
    );

    const loadingDataTestSubj = `${dataTestSubj}Loading`;
    expect(getByTestId(loadingDataTestSubj)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    const { container } = render(
      <InsightsSubSection error={true} title={title}>
        {children}
      </InsightsSubSection>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if no title', () => {
    const { container } = render(<InsightsSubSection title={''}>{children}</InsightsSubSection>);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if no children', () => {
    const { container } = render(
      <InsightsSubSection error={true} title={title}>
        {null}
      </InsightsSubSection>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
