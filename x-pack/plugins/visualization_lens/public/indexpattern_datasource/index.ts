/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Figure out how to separate this out into another plugin
import { editorFrame } from '../../';

import { indexPatternDatasource } from './indexpattern';

editorFrame.registerDatasource(indexPatternDatasource);

export * from './indexpattern';
