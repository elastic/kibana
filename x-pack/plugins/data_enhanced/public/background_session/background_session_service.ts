/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';

export class BackgroundSessionService {
  constructor(
    private readonly http: HttpStart,
    private readonly search: DataPublicPluginStart['search']
  ) {}

  public async store() {
    return await this.http.post(`/internal/session/${this.search.getSessionId()}/save`);
  }
}
