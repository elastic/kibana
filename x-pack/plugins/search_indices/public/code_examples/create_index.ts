/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateIndexCodeExamples } from '../types';
import {
  CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION,
  CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE,
  INSTALL_INSTRUCTIONS_DESCRIPTION,
  INSTALL_INSTRUCTIONS_TITLE,
} from './constants';

import { CurlCreateIndexExamples } from './curl';
import { JavascriptServerlessCreateIndexExamples } from './javascript';
import { PythonServerlessCreateIndexExamples } from './python';
import { ConsoleCreateIndexExamples } from './sense';

export const DefaultServerlessCodeExamples: CreateIndexCodeExamples = {
  exampleType: 'search',
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  createIndexTitle: CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE,
  createIndexDescription: CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION,
  sense: ConsoleCreateIndexExamples.default,
  curl: CurlCreateIndexExamples.default,
  python: PythonServerlessCreateIndexExamples.default,
  javascript: JavascriptServerlessCreateIndexExamples.default,
};

export const DenseVectorSeverlessCodeExamples: CreateIndexCodeExamples = {
  exampleType: 'vector',
  installTitle: INSTALL_INSTRUCTIONS_TITLE,
  installDescription: INSTALL_INSTRUCTIONS_DESCRIPTION,
  createIndexTitle: CONNECT_CREATE_VECTOR_INDEX_CMD_TITLE,
  createIndexDescription: CONNECT_CREATE_VECTOR_INDEX_CMD_DESCRIPTION,
  sense: ConsoleCreateIndexExamples.dense_vector,
  curl: CurlCreateIndexExamples.dense_vector,
  python: PythonServerlessCreateIndexExamples.dense_vector,
  javascript: JavascriptServerlessCreateIndexExamples.dense_vector,
};
