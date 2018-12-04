/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MANAGEMENT_BREADCRUMB } from 'ui/management/breadcrumbs';

export function getUsersBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: 'Users',
      href: '#/management/security/users',
    },
  ];
}

export function getEditUserBreadcrumbs($route: any) {
  const { username } = $route.current.params;
  return [
    ...getUsersBreadcrumbs(),
    {
      text: username,
      href: `#/management/security/users/edit/${username}`,
    },
  ];
}

export function getRolesBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: 'Roles',
      href: '#/management/security/roles',
    },
  ];
}

export function getEditRoleBreadcrumbs($route: any) {
  const { name } = $route.current.params;
  return [
    ...getRolesBreadcrumbs(),
    {
      text: name,
      href: `#/management/security/roles/edit/${name}`,
    },
  ];
}
