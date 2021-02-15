/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import type { UrlDrilldownCollectConfigProps } from './url_drilldown_collect_config';

const UrlDrilldownCollectConfigLazy = React.lazy(() =>
  import('./url_drilldown_collect_config').then(({ UrlDrilldownCollectConfig }) => ({
    default: UrlDrilldownCollectConfig,
  }))
);

export type { UrlDrilldownCollectConfigProps };

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfigProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <UrlDrilldownCollectConfigLazy {...props} />
    </React.Suspense>
  );
};
