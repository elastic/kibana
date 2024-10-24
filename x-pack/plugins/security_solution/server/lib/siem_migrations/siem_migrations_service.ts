/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ReplaySubject, type Subject } from 'rxjs';
import type { ConfigType } from '../../config';
import { SiemRuleMigrationsService } from './rules/siem_rule_migrations_service';
import type {
  SiemMigrationsClient,
  SiemMigrationsSetupParams,
  SiemMigrationsGetClientParams,
} from './types';

export class SiemMigrationsService {
  private pluginStop$: Subject<void>;
  private rules: SiemRuleMigrationsService;

  constructor(private config: ConfigType, logger: Logger, kibanaVersion: string) {
    this.pluginStop$ = new ReplaySubject(1);
    this.rules = new SiemRuleMigrationsService(logger, kibanaVersion);
  }

  setup(params: SiemMigrationsSetupParams) {
    if (this.config.experimentalFeatures.siemMigrationsEnabled) {
      this.rules.setup({ ...params, pluginStop$: this.pluginStop$ });
    }
  }

  createClient(params: SiemMigrationsGetClientParams): SiemMigrationsClient {
    return {
      rules: this.rules.getClient(params),
    };
  }

  stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
