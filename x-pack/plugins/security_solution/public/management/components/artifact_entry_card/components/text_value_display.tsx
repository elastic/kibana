/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiText } from '@elastic/eui';

export type TextValueDisplayProps = PropsWithChildren<{
  bold?: boolean;
}>;

/**
 * Common component for displaying consistent text across the card. Changes here could impact all of
 * display of values on the card
 */
export const TextValueDisplay = memo<TextValueDisplayProps>(({ bold, children }) => {
  return <EuiText size="s">{bold ? <strong>{children}</strong> : children}</EuiText>;
});
TextValueDisplay.displayName = 'TextValueDisplay';
