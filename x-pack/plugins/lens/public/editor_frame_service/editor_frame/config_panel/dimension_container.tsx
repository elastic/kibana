/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_container.scss';

import React from 'react';
import { FlyoutContainer } from '../../../shared_components/flyout_container';

export function DimensionContainer({
  panel,
  ...props
}: {
  isOpen: boolean;
  handleClose: () => void;
  panel: React.ReactElement | null;
  label: string;
  isFullscreen: boolean;
  panelRef: (el: HTMLDivElement) => void;
  isInlineEditing?: boolean;
}) {
  return <FlyoutContainer {...props}>{panel}</FlyoutContainer>;
}
