/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash/fp';
import { render } from '@testing-library/react';
import { AlertRendererPanel } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { mockAlertNestedDetailsTimelineResponse } from '../../../__mocks__';
import { ALERT_RENDERER_FIELDS } from '../../../../../../timelines/components/timeline/body/renderers/alert_renderer';

describe('AlertDetailsPage - SummaryTab - AlertRendererPanel', () => {
  it('should render the reason renderer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertRendererPanel dataAsNestedObject={mockAlertNestedDetailsTimelineResponse} />
      </TestProviders>
    );

    expect(getByTestId('alert-renderer-panel')).toBeVisible();
  });

  it('should render the render the expected values', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertRendererPanel dataAsNestedObject={mockAlertNestedDetailsTimelineResponse} />
      </TestProviders>
    );
    const alertRendererPanelPanel = getByTestId('alert-renderer-panel');

    ALERT_RENDERER_FIELDS.forEach((rendererField) => {
      const fieldValues: string[] | null = get(
        rendererField,
        mockAlertNestedDetailsTimelineResponse
      );
      if (fieldValues && fieldValues.length > 0) {
        fieldValues.forEach((value) => {
          expect(alertRendererPanelPanel).toHaveTextContent(value);
        });
      }
    });
  });

  it('should not render the reason renderer if data is not provided', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AlertRendererPanel dataAsNestedObject={null} />
      </TestProviders>
    );

    expect(queryByTestId('alert-renderer-panel')).toBeNull();
  });
});
