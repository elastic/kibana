/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/public';

export interface SideNavigationSettings {
  hasInfrastructureHosts: boolean;
}

export function useSideNavigationSettings(core: CoreStart): SideNavigationSettings {
  const hasInfrastructureHosts = useObservable(
    core.settings.client.get$<boolean>(enableInfrastructureHostsView),
    false
  );

  return {
    hasInfrastructureHosts,
  };
}
