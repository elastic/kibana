/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo } from 'react';
import { useUpsellingComponent } from '../common/hooks/use_upselling';

export const LazyPliBlockCsp = memo(() => {
  return useUpsellingComponent('cloud_security_posture_integration_installation');
});

LazyPliBlockCsp.displayName = 'LazyPliBlockCsp';
