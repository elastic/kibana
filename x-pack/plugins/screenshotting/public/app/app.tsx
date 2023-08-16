/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';
import React, { useContext, useMemo, useRef } from 'react';
import type { ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import { useExpressionRenderer } from '@kbn/expressions-plugin/public';
import { SCREENSHOTTING_EXPRESSION, SCREENSHOTTING_EXPRESSION_INPUT } from '../../common';
import { ScreenshotModeContext } from './screenshot_mode_context';

export function App() {
  const elementRef = useRef(null);
  const screenshotMode = useContext(ScreenshotModeContext);
  const expression = useMemo(
    () =>
      screenshotMode?.getScreenshotContext<ExpressionRendererParams['expression']>(
        SCREENSHOTTING_EXPRESSION
      ) ?? '',
    [screenshotMode]
  );
  const context = useMemo(
    () => screenshotMode?.getScreenshotContext(SCREENSHOTTING_EXPRESSION_INPUT),
    [screenshotMode]
  );
  const { error, isEmpty } = useExpressionRenderer(elementRef, {
    expression,
    context,
  });

  return (
    <div
      data-shared-item={!isEmpty || !error || null}
      data-render-error={!isEmpty && error ? error.message : null}
      ref={elementRef}
      className="scrExpression"
      style={{
        background: 'white',
        width: '100vw',
        height: '100vh',
      }}
    />
  );
}
