/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverlayRef } from 'src/core/public';

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

export type OpenModal = (
  modalChildren: React.ReactNode,
  modalProps?: {
    closeButtonAriaLabel?: string;
    'data-test-subj'?: string;
  }
) => OverlayRef;
