/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateIndexCodeExamples } from '../types';

import { CurlExamples } from './curl';
import { JavascriptServerlessExamples } from './javascript';
import { PythonServerlessExamples } from './python';
import { ConsoleExamples } from './sense';

export const DefaultServerlessCodeExamples: CreateIndexCodeExamples = {
  sense: ConsoleExamples.default,
  curl: CurlExamples.default,
  python: PythonServerlessExamples.default,
  javascript: JavascriptServerlessExamples.default,
};

export const DenseVectorSeverlessCodeExamples: CreateIndexCodeExamples = {
  sense: ConsoleExamples.dense_vector,
  curl: CurlExamples.dense_vector,
  python: PythonServerlessExamples.dense_vector,
  javascript: JavascriptServerlessExamples.dense_vector,
};
