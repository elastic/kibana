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
  constructor(private basePath: HttpSetup['basePath']) {}

  logout() {
    const next = this.basePath.remove(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    window.location.assign(
      this.basePath.prepend(`/logout?next=${encodeURIComponent(next)}&msg=SESSION_EXPIRED`)
    );
  }
}
