/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsolateHostPanelProps } from '../../isolate_host';
import type { LeftPanelProps } from '../../left';
import type { PreviewPanelProps } from '../../preview';
import type { RightPanelProps } from '../../right';

export const DocumentDetailsRightPanelKey: RightPanelProps['key'] = 'document-details-right';
export const DocumentDetailsLeftPanelKey: LeftPanelProps['key'] = 'document-details-left';
export const DocumentDetailsPreviewPanelKey: PreviewPanelProps['key'] = 'document-details-preview';
export const DocumentDetailsIsolateHostPanelKey: IsolateHostPanelProps['key'] =
  'document-details-isolate-host';
