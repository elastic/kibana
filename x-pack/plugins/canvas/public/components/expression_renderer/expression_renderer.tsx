/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { State } from '../../../types';
import { ExpressionAstExpression } from '../../../../../../src/plugins/expressions';
import { useExpressionsContract } from '../../contracts';
import { getWorkpadVariablesAsObject } from '../../state/selectors/workpad';

interface Props {
  expression: string | ExpressionAstExpression;
}

export const ExpressionRenderer: FC<Props> = ({ expression }) => {
  const { ExpressionRenderer: Renderer } = useExpressionsContract();
  const variables = useSelector((state: State) => getWorkpadVariablesAsObject(state));

  return <Renderer expression={expression} variables={variables} />;
};
