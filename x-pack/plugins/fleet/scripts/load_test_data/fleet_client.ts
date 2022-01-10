/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class FleetClient {
  constructor(
    private readonly kibanaUrl: string,
    private readonly kibanaUsername: string,
    private readonly kibanaPassword: string
  ) {}

  private async _makeRequest(
    url: string,
    options?: {
      method: string;
      body: string;
    }
  ) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.kibanaUsername}:${this.kibanaPassword}`
        ).toString('base64')}`,
        'kbn-xsrf': 'xx',
        'Content-type': 'application/json',
      },
      ...options,
    });

    return res.json();
  }

  async getPolicies(page: number, perPage: number, kuery = '') {
    return await this._makeRequest(
      `${this.kibanaUrl}/api/fleet/agent_policies?perPage=${perPage}&kuery=${kuery}`
    );
  }

  async postPolicies(data: { name: string; namespace: string; description: string }) {
    return await this._makeRequest(`${this.kibanaUrl}/api/fleet/agent_policies`, {
      body: JSON.stringify(data),
      method: 'POST',
    });
  }
}
