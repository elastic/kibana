/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigType } from '../config';

export class AppClient {
  private readonly signalsIndex: string;

  constructor(private spaceId: string, private config: ConfigType) {
    const configuredSignalsIndex = this.config.signalsIndex;

    this.signalsIndex = `${configuredSignalsIndex}-${this.spaceId}`;
  }

  public getSignalsIndex = (): string => this.signalsIndex;
}
