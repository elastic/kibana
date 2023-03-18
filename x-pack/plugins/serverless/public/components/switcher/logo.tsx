/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ProjectType } from '../../types';

export interface Props {
  project: ProjectType;
}

export const Logo = ({ project }: Props) => {
  let type = 'logoElastic';
  switch (project) {
    case 'es':
      type = 'logoElasticsearch';
      break;
    case 'security':
      type = 'logoSecurity';
      break;
    case 'oblt':
      type = 'logoObservability';
      break;
  }

  return <EuiIcon type={type} size="xxl" />;
};
