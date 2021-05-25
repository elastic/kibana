/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { IIndexPattern } from 'src/plugins/data/public';

export type IndexPatternContextValue = IIndexPattern | null;
export const IndexPatternContext = React.createContext<IndexPatternContextValue>(null);
