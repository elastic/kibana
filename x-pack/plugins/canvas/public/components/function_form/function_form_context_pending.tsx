/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { Loading } from '../loading';
import { CanvasElement, ExpressionContext } from '../../../types';
import { ExpressionType } from '../../expression_types/types';

interface FunctionFormContextPendingProps {
  context?: ExpressionContext;
  contextExpression?: string;
  expressionType: ExpressionType;
  updateContext: (element?: CanvasElement) => void;
}

export const FunctionFormContextPending: FC<FunctionFormContextPendingProps> = (props) => {
  const { contextExpression, expressionType, context, updateContext } = props;
  const prevContextExpression = usePrevious(contextExpression);
  const fetchContext = useCallback(
    (force = false) => {
      // dispatch context update if none is provided
      if (force || (context == null && expressionType.requiresContext)) {
        updateContext();
      }
    },
    [context, expressionType.requiresContext, updateContext]
  );

  useEffect(() => {
    const forceUpdate =
      expressionType.requiresContext && prevContextExpression !== contextExpression;
    fetchContext(forceUpdate);
  }, [contextExpression, expressionType, fetchContext, prevContextExpression]);

  return (
    <div className="canvasFunctionForm canvasFunctionForm--loading">
      <Loading />
    </div>
  );
};
