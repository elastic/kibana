/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalPageName } from '../constants';
import type { ProjectNavigationLink } from '../types';
import { DISCOVER_TITLE } from './discover_translations';

export const discoverNavLink: ProjectNavigationLink = {
  id: ExternalPageName.discover,
  title: DISCOVER_TITLE,
};
