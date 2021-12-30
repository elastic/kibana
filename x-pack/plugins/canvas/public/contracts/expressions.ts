/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsStart } from '../../../../../src/plugins/expressions/public';
import { createGetterSetter } from '../../../../../src/plugins/kibana_utils/public';
import { CanvasStartDeps } from '../plugin';

const [getExpressionRenderer, setExpressionRenderer] =
  createGetterSetter<ExpressionsStart['ReactExpressionRenderer']>('ExpressionsRenderer');

export const setupExpressionsContract = ({ expressions }: CanvasStartDeps) => {
  setExpressionRenderer(expressions.ReactExpressionRenderer);
};

export const getExpressionsContract = () => ({
  ExpressionRenderer: getExpressionRenderer(),
});
