/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { useAnalyzeDataMenuItem } from './use_analyze_data_menu_item';

export function AnalyzeDataButton() {
  const item = useAnalyzeDataMenuItem();

  if (!item?.href) {
    return null;
  }

  // AppMenu allows tooltipContent as string | (() => string); EuiToolTip wants ReactNode.
  const tooltipContent =
    typeof item.tooltipContent === 'function' ? item.tooltipContent() : item.tooltipContent;

  return (
    <EuiToolTip position="top" content={tooltipContent}>
      <EuiButtonEmpty data-test-subj={item.testId} href={item.href} iconType={item.iconType}>
        {item.label}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
}
