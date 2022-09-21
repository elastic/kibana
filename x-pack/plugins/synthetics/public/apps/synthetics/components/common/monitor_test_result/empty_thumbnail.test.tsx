/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import {
  EmptyThumbnail,
  SCREENSHOT_LOADING_ARIA_LABEL,
  SCREENSHOT_NOT_AVAILABLE,
} from './empty_thumbnail';

describe('EmptyThumbnail', () => {
  it('renders a loading placeholder for loading state', () => {
    const { getByLabelText, getByTestId } = render(<EmptyThumbnail isLoading={true} />);

    expect(getByTestId('stepScreenshotPlaceholderLoading')).toBeInTheDocument();
    expect(getByLabelText(SCREENSHOT_LOADING_ARIA_LABEL));
  });

  it('renders no image available when not loading', () => {
    const { queryByTestId, getByLabelText } = render(<EmptyThumbnail isLoading={false} />);

    expect(queryByTestId('stepScreenshotPlaceholderLoading')).not.toBeInTheDocument();
    expect(getByLabelText(SCREENSHOT_NOT_AVAILABLE));
  });
});
