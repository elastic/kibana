/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

// Because we're only getting the actual contextvalue within a wrapping angular component,
// we need to initialize here with `null` because TypeScript doesn't allow createContext()
// without a default value. The union type `IndexPatternContextValue` takes care of allowing
// the actual required type and `null`.
export type IndexPatternContextValue = StaticIndexPattern | null;
export const IndexPatternContext = React.createContext<IndexPatternContextValue>(null);
