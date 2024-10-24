/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { ReportingUser } from '../../types';

/**
 * Returns an AuthenticatedUser object, or `false` in the case where Security is disabled
 */
export function getUser(request: KibanaRequest, securityService: SecurityServiceStart) {
  return securityService.authc.getCurrentUser(request) ?? false;
}

/**
 * Pre 9.0, reports are associated with the user by the username field
 */
export function getUsername(user: ReportingUser) {
  return user ? user.username : false;
}

/**
 * In 9.0 and higher, reports are associated with the user using a triple that uniquely identifies the user
 */
export function getUserTriple(user: ReportingUser) {
  if (user) {
    return [
      user.username, // can not use user.profile_uid as sometimes it is undefined
      user.authentication_realm.type,
      user.authentication_realm.name,
    ].join(':');
  }
  return false;
}
