/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';

/**
 * Checks if the current user should be able to see the response actions history
 * menu item based on their current privileges
 */
export function useCanSeeResponseActionsHistoryMenu(): boolean {
  const privileges = useEndpointPrivileges();

  return privileges.canAccessResponseActionsHistory;
}
