/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';

import { InsightAccordion } from './insight_accordion';

const noopRenderer = () => null;

describe('InsightAccordion', () => {
  it("shows a loading indicator when it's in the loading state", () => {
    const loadingText = 'loading text';
    render(
      <TestProviders>
        <InsightAccordion
          state="loading"
          text={loadingText}
          prefix=""
          renderContent={noopRenderer}
        />
      </TestProviders>
    );

    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  it("shows an error when it's in the error state", () => {
    const errorText = 'error text';
    render(
      <TestProviders>
        <InsightAccordion state="error" text={errorText} prefix="" renderContent={noopRenderer} />
      </TestProviders>
    );

    expect(screen.getByText(errorText)).toBeInTheDocument();
  });

  it('shows the text and renders the correct content', () => {
    const text = 'the text';
    const contentText = 'content text';
    const contentRenderer = () => <span>{contentText}</span>;
    render(
      <TestProviders>
        <InsightAccordion state="success" text={text} prefix="" renderContent={contentRenderer} />
      </TestProviders>
    );

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
  });
});
