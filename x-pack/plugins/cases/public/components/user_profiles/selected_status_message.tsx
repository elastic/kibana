/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const SelectedStatusMessageComponent: React.FC<{
  selectedCount: number;
  message: string;
}> = ({ selectedCount, message }) => {
  if (selectedCount <= 0) {
    return null;
  }

  return <>{message}</>;
};
SelectedStatusMessageComponent.displayName = 'SelectedStatusMessage';

export const SelectedStatusMessage = React.memo(SelectedStatusMessageComponent);
