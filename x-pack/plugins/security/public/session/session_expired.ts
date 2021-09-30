/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOGOUT_PROVIDER_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
  NEXT_URL_QUERY_STRING_PARAMETER,
} from '../../common/constants';
import type { LogoutReason } from '../../common/types';

const getNextParameter = () => {
  const { location } = window;
  const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
  return `&${NEXT_URL_QUERY_STRING_PARAMETER}=${next}`;
};

const getProviderParameter = (tenant: string) => {
  const key = `${tenant}/session_provider`;
  const providerName = sessionStorage.getItem(key);
  return providerName
    ? `&${LOGOUT_PROVIDER_QUERY_STRING_PARAMETER}=${encodeURIComponent(providerName)}`
    : '';
};

export class SessionExpired {
  constructor(private logoutUrl: string, private tenant: string) {}

  logout(reason: LogoutReason) {
    const next = getNextParameter();
    const provider = getProviderParameter(this.tenant);
    window.location.assign(
      `${this.logoutUrl}?${LOGOUT_REASON_QUERY_STRING_PARAMETER}=${reason}${next}${provider}`
    );
  }
}
