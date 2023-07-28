/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalPageName } from '../constants';
import type { ProjectNavigationLink } from '../types';
import { DEV_TOOLS_TITLE } from './translations';

export const devToolsNavLink: ProjectNavigationLink = {
  id: ExternalPageName.devToolsRoot,
  title: DEV_TOOLS_TITLE,
};
