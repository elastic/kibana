/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

export interface ISessionExpired {
  logout(): void;
}

export class SessionExpired {
  constructor(private basePath: HttpSetup['basePath'], private tenant: string) {}

  logout() {
    const next = this.basePath.remove(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    const key = `${this.tenant}/session_provider`;
    const providerName = sessionStorage.getItem(key);
    const provider = providerName ? `&provider=${encodeURIComponent(providerName)}` : '';
    window.location.assign(
      this.basePath.prepend(
        `/logout?next=${encodeURIComponent(next)}&msg=SESSION_EXPIRED${provider}`
      )
    );
  }
}
