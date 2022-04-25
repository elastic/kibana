/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';

export const getBaseBreadcrumb = (): ChromeBreadcrumb => ({
  text: 'Canvas',
  href: '#/',
});

export const getWorkpadBreadcrumb = ({
  name = 'Workpad',
}: { name?: string } = {}): ChromeBreadcrumb => ({
  text: name,
});
