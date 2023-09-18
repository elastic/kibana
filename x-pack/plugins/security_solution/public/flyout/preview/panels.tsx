/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertReasonPreview } from './components/alert_reason_preview';
import type { PreviewPanelPaths } from '.';
import { RulePreview } from './components/rule_preview';
import { RulePreviewFooter } from './components/rule_preview_footer';

export type PreviewPanelType = Array<{
  /**
   * Id of the preview panel
   */
  id: PreviewPanelPaths;
  /**
   * Main body component to be rendered in the panel
   */
  content: React.ReactElement;
  /**
   * Footer section in the panel
   */
  footer?: React.ReactElement;
}>;

/**
 * Array of all preview panels
 */
export const panels: PreviewPanelType = [
  {
    id: 'rule-preview',
    content: <RulePreview />,
    footer: <RulePreviewFooter />,
  },
  {
    id: 'alert-reason-preview',
    content: <AlertReasonPreview />,
  },
];
