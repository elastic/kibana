/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createElement as h, createContext, useContext } from 'react';
import { TagsService } from '../services';

type ContextValue = TagsService;

const context = createContext<ContextValue | undefined>(undefined);

export const TagsProvider = context.Provider;
export const useTagsService = () => useContext(context)!;
export const createTagsProvider = (value: ContextValue): React.FC => ({ children }) =>
  h(TagsProvider, { value, children });
