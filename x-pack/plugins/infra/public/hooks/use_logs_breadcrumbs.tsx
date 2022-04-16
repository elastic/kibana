/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs } from './use_breadcrumbs';
import { LOGS_APP } from '../../common/constants';
import { logsTitle } from '../translations';

export const useLogsBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  useBreadcrumbs(LOGS_APP, logsTitle, extraCrumbs);
};
