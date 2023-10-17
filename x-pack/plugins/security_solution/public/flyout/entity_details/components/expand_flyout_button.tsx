/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

interface ExpandFlyoutButtonType {
  isExpanded: boolean;
  onToggle: () => void;
  expandedText: string;
  collapsedText: string;
}

export const ExpandFlyoutButton = ({
  isExpanded,
  onToggle,
  expandedText,
  collapsedText,
}: ExpandFlyoutButtonType) => {
  return isExpanded ? (
    <EuiButtonEmpty
      size="xs"
      iconSide="left"
      onClick={onToggle}
      iconType="arrowEnd"
      aria-label={expandedText}
    >
      {expandedText}
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty
      size="xs"
      iconSide="left"
      onClick={onToggle}
      iconType="arrowStart"
      aria-label={collapsedText}
    >
      {collapsedText}
    </EuiButtonEmpty>
  );
};
