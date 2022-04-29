/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { NoImageAvailable } from './no_image_available';
import { imageLoadingSpinnerAriaLabel } from './translations';

export interface NoImageDisplayProps {
  imageCaption: JSX.Element;
  isLoading: boolean;
  isPending: boolean;
}

export const NoImageDisplay: React.FC<NoImageDisplayProps> = ({
  imageCaption,
  isLoading,
  isPending,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>
        {isLoading || isPending ? (
          <EuiLoadingSpinner
            aria-label={imageLoadingSpinnerAriaLabel}
            size="l"
            data-test-subj="pingTimestampSpinner"
          />
        ) : (
          <NoImageAvailable />
        )}
      </EuiFlexItem>
      <EuiFlexItem>{imageCaption}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
