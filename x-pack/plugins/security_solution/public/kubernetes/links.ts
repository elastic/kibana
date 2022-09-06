/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KUBERNETES_PATH, SecurityPageName } from '../../common/constants';
import { KUBERNETES } from '../app/translations';
import { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.kubernetes,
  title: KUBERNETES,
  path: KUBERNETES_PATH,
  globalNavEnabled: true,
  experimentalKey: 'kubernetesEnabled',
  globalSearchKeywords: ['Kubernetes'],
  globalNavOrder: 9005,
};
