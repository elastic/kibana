/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './visualization_container.scss';

import React from 'react';
import classNames from 'classnames';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  isReady?: boolean;
  reportTitle?: string;
  reportDescription?: string;
}

/**
 * This is a convenience component that wraps rendered Lens visualizations. It adds reporting
 * attributes (data-shared-item, data-render-complete, and data-title).
 */
export function VisualizationContainer({
  isReady = true,
  reportTitle,
  reportDescription,
  children,
  className,
  ...rest
}: Props) {
  const attributes: Partial<{ 'data-title': string; 'data-description': string }> = {};
  if (reportTitle) {
    attributes['data-title'] = reportTitle;
  }
  if (reportDescription) {
    attributes['data-description'] = reportDescription;
  }
  return (
    <div
      data-shared-item
      data-render-complete={isReady}
      className={classNames(className, 'lnsVisualizationContainer')}
      {...attributes}
      {...rest}
    >
      {children}
    </div>
  );
}
