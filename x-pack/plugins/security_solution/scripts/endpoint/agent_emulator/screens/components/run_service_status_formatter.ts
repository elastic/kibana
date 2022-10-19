/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bgCyan, red, dim } from 'chalk';
import type { BaseRunningService } from '../../../common/base_running_service';
import { DataFormatter } from '../../../common/screen';

export class RunServiceStatus extends DataFormatter {
  constructor(private readonly serviceOrIsRunning: boolean | BaseRunningService) {
    super();
  }

  protected getOutput(): string {
    const isRunning =
      typeof this.serviceOrIsRunning === 'boolean'
        ? this.serviceOrIsRunning
        : this.serviceOrIsRunning.isRunning;

    if (isRunning) {
      return bgCyan(' Running ');
    }

    return dim(red(' Stopped '));
  }
}
