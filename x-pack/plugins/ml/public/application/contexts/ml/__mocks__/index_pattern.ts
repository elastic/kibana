/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

export const indexPatternMock = ({
  id: 'the-index-pattern-id',
  title: 'the-index-pattern-title',
  fields: [],
} as unknown) as IndexPattern;
