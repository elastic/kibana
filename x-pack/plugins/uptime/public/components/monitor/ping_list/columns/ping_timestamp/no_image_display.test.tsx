/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { NoImageDisplay, NoImageDisplayProps } from './no_image_display';
import { imageLoadingSpinnerAriaLabel } from './translations';

describe('NoImageDisplay', () => {
  let defaultProps: NoImageDisplayProps;
  beforeEach(() => {
    defaultProps = {
      imageCaption: <div>test caption</div>,
      isLoading: false,
      isPending: false,
    };
  });

  it('renders a loading spinner for loading state', () => {
    defaultProps.isLoading = true;
    const { getByText, getByLabelText } = render(<NoImageDisplay {...defaultProps} />);

    expect(getByLabelText(imageLoadingSpinnerAriaLabel));
    expect(getByText('test caption'));
  });

  it('renders a loading spinner for pending state', () => {
    defaultProps.isPending = true;
    const { getByText, getByLabelText } = render(<NoImageDisplay {...defaultProps} />);

    expect(getByLabelText(imageLoadingSpinnerAriaLabel));
    expect(getByText('test caption'));
  });

  it('renders no image available when not loading or pending', () => {
    const { getByText } = render(<NoImageDisplay {...defaultProps} />);

    expect(getByText('No image available'));
    expect(getByText('test caption'));
  });
});
