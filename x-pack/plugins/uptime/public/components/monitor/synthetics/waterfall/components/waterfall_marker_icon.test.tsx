/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallMarkerIcon } from './waterfall_marker_icon';
import { TestWrapper } from './waterfall_marker_test_helper';

describe('<WaterfallMarkerIcon />', () => {
  it('renders a dot icon when `field` is an empty string', () => {
    const { getByLabelText } = render(<WaterfallMarkerIcon field="" label="" />);
    expect(getByLabelText('An icon indicating that this marker has no field associated with it'));
  });

  it('renders an embeddable when opened', async () => {
    const { getByLabelText, getByText } = render(
      <TestWrapper
        activeStep={{
          '@timestamp': '123',
          _id: 'id',
          synthetics: {
            type: 'step/end',
            step: {
              index: 0,
              status: 'succeeded',
              name: 'test-name',
              duration: {
                us: 9999,
              },
            },
          },
          monitor: {
            id: 'mon-id',
            check_group: 'group',
            timespan: {
              gte: '1988-10-09T12:00:00.000Z',
              lt: '1988-10-10T12:00:00.000Z',
            },
          },
        }}
        basePath="xyz"
      >
        <WaterfallMarkerIcon field="testField" label="Test Field" />
      </TestWrapper>
    );

    const expandButton = getByLabelText(
      'Use this icon button to show metrics for this annotation marker.'
    );

    fireEvent.click(expandButton);

    await waitFor(() => {
      getByText('Test Field');
    });
  });
});
