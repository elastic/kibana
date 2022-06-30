/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { LoadingImageState, NoImageAvailable } from './no_image_available';

export interface NoImageDisplayProps {
  imageCaption: JSX.Element;
  isLoading?: boolean;
}

export const NoImageDisplay: React.FC<NoImageDisplayProps> = ({ imageCaption, isLoading }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>{isLoading ? <LoadingImageState /> : <NoImageAvailable />}</EuiFlexItem>
      <EuiFlexItem>{imageCaption}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
