/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { SessionService } from '../../../../../src/plugins/data/public';
import { IEnhancedSessionService } from '../search/types';

export class EnhancedSessionService extends SessionService implements IEnhancedSessionService {
  constructor(private readonly http: HttpStart) {
    super();
  }

  public async store(sessionId?: string, searchIdMap?: Record<string, string>) {
    try {
      const response = await this.http.post(`/internal/session/${sessionId || this.get()}/save`, {
        body: JSON.stringify({ searchIds: searchIdMap }),
      });
      this.isStored = true;
      return response;
    } catch (e) {
      this.isStored = false;
    }
  }
}
