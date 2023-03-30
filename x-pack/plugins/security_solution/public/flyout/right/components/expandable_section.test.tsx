/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CONTENT_TEST_ID, ExpandableSection, HEADER_TEST_ID } from './expandable_section';

const title = 'title';
const children = <div>{'content'}</div>;
const testId = 'test';
const headerTestId = testId + HEADER_TEST_ID;
const contentTestId = testId + CONTENT_TEST_ID;

describe('<ExpandableSection />', () => {
  it('should render the component collapsed', () => {
    const { getByTestId } = render(
      <ExpandableSection expanded={false} title={title} data-test-subj={testId}>
        {children}
      </ExpandableSection>
    );

    expect(getByTestId(headerTestId)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = render(
      <ExpandableSection expanded={true} title={title} data-test-subj={testId}>
        {children}
      </ExpandableSection>
    );

    expect(getByTestId(headerTestId)).toBeInTheDocument();
    expect(getByTestId(contentTestId)).toBeInTheDocument();
  });

  it('should expand the component when clicking on the arrow on header', () => {
    const { getByTestId } = render(
      <ExpandableSection expanded={false} title={title} data-test-subj={testId}>
        {children}
      </ExpandableSection>
    );

    getByTestId(headerTestId).click();
    expect(getByTestId(contentTestId)).toBeInTheDocument();
  });
});
