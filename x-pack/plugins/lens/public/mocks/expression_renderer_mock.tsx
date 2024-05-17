/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
import React from 'react';

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn(({ expression }) => (
    <span data-test-subj="lnsExpressionRenderer">{expression || 'Expression renderer mock'}</span>
  ));
}
