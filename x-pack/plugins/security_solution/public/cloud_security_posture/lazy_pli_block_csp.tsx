/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useUpsellingComponent } from '../common/hooks/use_upselling';

export const LazyPliBlockCsp = (): React.ComponentType | null => {
  console.log('C:asdfasdfasdf ');
  const C = useUpsellingComponent('cloud_security_posture_integration_installation');
  console.log('C: ', C);
  return useUpsellingComponent('cloud_security_posture_integration_installation');
};
