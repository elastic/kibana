/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamQualityCheckExecution, Mitigation, MitigationExecution } from '../../../common';
import {
  checkForIgnoredFields,
  DataStreamQualityCheck,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckDependencies,
} from './checks';
import {
  DataStreamQualityMitigationDependencies,
  GenericMitigationImplementation,
  increaseIgnoreAboveMitigation,
} from './mitigations';

export class DataStreamQualityService {
  private checks: DataStreamQualityCheck[] = [checkForIgnoredFields];
  private mitigations: Array<GenericMitigationImplementation<any>> = [
    increaseIgnoreAboveMitigation,
  ];

  constructor(
    private readonly dependencies: DataStreamQualityCheckDependencies &
      DataStreamQualityMitigationDependencies
  ) {}

  public async getChecks({ dataStream, timeRange }: DataStreamQualityCheckArguments) {
    const { data_streams: dataStreamInfos } =
      await this.dependencies.elasticsearchClient.asCurrentUser.indices.resolveIndex({
        name: dataStream,
        expand_wildcards: 'open',
      });

    return dataStreamInfos.flatMap(({ name }) =>
      this.checks.map((check) => ({
        checkId: check.id,
        dataStream: name,
        timeRange,
      }))
    );
  }

  public async performCheck(
    checkId: string,
    args: DataStreamQualityCheckArguments
  ): Promise<DataStreamQualityCheckExecution> {
    const [check] = this.checks.filter((_check) => _check.id === checkId);

    const started = new Date().toISOString();
    const result = await check
      .apply(this.dependencies)(args)
      .catch((err) => ({
        type: 'error' as const,
        name: err.name,
        description: err.message,
      }));
    const finished = new Date().toISOString();

    return {
      id: check.id,
      started,
      finished,
      result,
    };
  }

  public async applyMitigation(
    mitigationId: string,
    mitigationArgs: Omit<Mitigation, 'type'>
  ): Promise<MitigationExecution> {
    const [mitigation] = this.mitigations.filter((_mitigation) => _mitigation.id === mitigationId);

    const started = new Date().toISOString();
    const result = await mitigation
      .apply(this.dependencies)(mitigationArgs)
      .catch((err) => ({
        type: 'error' as const,
        name: err.name,
        description: err.message,
      }));
    const finished = new Date().toISOString();

    return {
      id: mitigationId,
      started,
      finished,
      result,
    };
  }
}
