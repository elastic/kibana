/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Result as ResultType } from '../../../result/types';
import { Result } from '../../../result/result';

export interface Props {
  result: ResultType;
}

export const ResultView: React.FC<Props> = ({ result }) => {
  return (
    <li>
      <Result result={result} />
    </li>
  );
};
