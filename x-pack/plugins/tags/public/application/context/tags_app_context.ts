/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { TagsAppServices } from '../services';

export const context = createContext<TagsAppServices | undefined>(undefined);
export const useTagsApp = () => useContext(context)!;
