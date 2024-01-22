/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamQualityCheckExecution } from '../../../common';
import {
  checkForIgnoredFields,
  DataStreamQualityCheck,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckDependencies,
} from './checks';

export class DataStreamQualityService {
  private checks: DataStreamQualityCheck[] = [checkForIgnoredFields];

  constructor(private readonly dependencies: DataStreamQualityCheckDependencies) {}

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
    const result = await check.apply(this.dependencies)(args);
    const finished = new Date().toISOString();

    return {
      id: check.id,
      started,
      finished,
      result,
    };
  }
}
