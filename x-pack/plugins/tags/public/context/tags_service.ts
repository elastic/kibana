/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { TagsService } from '../services';

const context = createContext<TagsService | undefined>(undefined);

export const TagsServiceProvider = context.Provider;
export const useTagsService = () => useContext(context)!;
