/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import React from 'react';
import { RelatedDetectionRulesCallout } from './related_detection_rules_callout';
import { exactMatchText } from '../mocks';
import userEvent from '@testing-library/user-event';

describe('Policy form RelatedDetectionRulesCallout component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    history = mockedContext.history;
    render = () => {
      renderResult = mockedContext.render(<RelatedDetectionRulesCallout data-test-subj="test" />);
      return renderResult;
    };
  });

  it('should render with expected content', () => {
    render();

    expect(renderResult.getByTestId('test')).toHaveTextContent(
      exactMatchText(
        'View related detection rules. Prebuilt rules are tagged “Elastic” on the Detection Rules page.'
      )
    );
  });

  it('should navigate to Detection Rules when link is clicked', () => {
    render();
    userEvent.click(renderResult.getByTestId('test-link'));

    expect(history.location.pathname).toEqual('/rules');
  });
});
