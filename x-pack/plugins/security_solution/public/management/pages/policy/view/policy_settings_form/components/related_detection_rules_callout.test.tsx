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

describe('Policy form RelatedDetectionRulesCallout component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    render = () => {
      renderResult = mockedContext.render(<RelatedDetectionRulesCallout data-test-subj="test" />);
      return renderResult;
    };
  });

  it('should render with expected content', () => {
    render();

    expect(renderResult.getByTestId('test')).toHaveTextContent(
      exactMatchText(
        'The Endpoint Security detection rule is enabled automatically with Elastic Defend. This rule must remain enabled to receive Endpoint alerts. Learn MoreExternal link(opens in a new tab or window).'
      )
    );
  });

  it('should contain a link to the detection engine overview docs', () => {
    render();
    const anchor: HTMLAnchorElement = renderResult.getByTestId('test-link') as HTMLAnchorElement;

    expect(anchor.href).toContain('detection-engine-overview.html');
  });
});
