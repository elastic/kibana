/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';

export type KubernetesSecurityServices = CoreStart;

export interface KubernetesSecurityDeps {
  filter: React.ReactNode;
}

export interface KubernetesSecurityStart {
  getKubernetesPage: (kubernetesSecurityDeps: KubernetesSecurityDeps) => JSX.Element;
}
