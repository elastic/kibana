/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { TagsManagementServices } from '../services/tags_management_services';

const context = createContext<TagsManagementServices | null>(null);

export const ServicesProvider = context.Provider;
export const useServices = () => useContext(context)!;
