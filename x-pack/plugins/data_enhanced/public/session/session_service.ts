/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { SessionService } from '../../../../../src/plugins/data/public';
import { IEnhancedSessionService } from '../search/types';

export class EnhancedSessionService extends SessionService implements IEnhancedSessionService {
  constructor(
    private readonly http: HttpStart,
  ) {
    super();
  }

  public async store(sessionId?: string) {
    return await this.http.post(`/internal/session/${sessionId || this.get()}/save`);
  }

  public async getSearchIds(sessionId?: string) {
    try {
      return await this.http.get(`/internal/session/${sessionId || this.get()}`);
    } catch (e) {
      return undefined;
    }
  }
}
