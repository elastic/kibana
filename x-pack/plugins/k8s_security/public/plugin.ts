/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { K8sSecurityDeps, K8sSecurityServices } from './types';
import { getK8sSecurityLazy } from './methods';

export type { K8sSecurityStart } from './types';

export class K8sSecurityPlugin implements Plugin {
  public setup(core: CoreSetup<K8sSecurityServices, void>) {}

  public start(core: CoreStart) {
    return {
      getK8sPage: (k8sSecurityDeps: K8sSecurityDeps) => getK8sSecurityLazy(k8sSecurityDeps),
    };
  }

  public stop() {}
}
