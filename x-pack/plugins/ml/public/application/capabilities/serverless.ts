/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkPermission, usePermissionCheck } from './check_capabilities';

export function useIsServerless(): boolean {
  const results = usePermissionCheck(['isADEnabled', 'isDFAEnabled', 'isNLPEnabled']);
  return results.some((r) => r === false);
}

/**
 * @deprecated use {@link useIsServerless} instead.
 */
export function isServerless() {
  return (
    (checkPermission('isADEnabled') &&
      checkPermission('isDFAEnabled') &&
      checkPermission('isNLPEnabled')) === false
  );
}
