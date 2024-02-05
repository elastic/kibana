/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  CheckPlan,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckExecution,
  MitigationParams,
} from '../../../common';

export type DataStreamQualityServiceSetup = void;

export interface DataStreamQualityServiceStart {
  client: IDataStreamQualityClient;
}

export interface DataStreamQualityServiceStartDeps {
  http: HttpStart;
}

export interface IDataStreamQualityClient {
  getCheckPlan(args: DataStreamQualityCheckArguments): Promise<CheckPlan>;
  performCheck(
    checkId: string,
    args: DataStreamQualityCheckArguments
  ): Promise<DataStreamQualityCheckExecution>;
  applyMitigation(dataStream: string, mitigation: MitigationParams): Promise<void>;
}
