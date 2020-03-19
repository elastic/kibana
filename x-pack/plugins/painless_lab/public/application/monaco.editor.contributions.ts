/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This file is where we add all of the monaco editor extensions we want to load.
// Importing this file will have the side-effect of registering extensions to the global monaco
// instance.

// This enables word-wise charactor movements like alt-left.
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations';
