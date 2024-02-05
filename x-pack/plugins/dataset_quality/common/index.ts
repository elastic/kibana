/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dataStreamRT, dataStreamTypeRT } from './data_stream';
export type { DataStream, DataStreamType } from './data_stream';
export {
  checkErrorResultRT,
  checkFailedResultRT,
  checkPassedResultRT,
  checkPlanRT,
  checkPlanStepRT,
  checkResultRT,
  checkSkippedResultRT,
  dataStreamQualityCheckArgumentsRT,
  dataStreamQualityCheckExecutionRT,
  ignoredFieldCauseRT,
  ignoredFieldProblemRT,
  ingestPipelineErrorProblemRT,
  mitigationRT,
  mitigationForCauseRT,
  qualityProblemRT,
} from './data_stream_quality_checks';
export type {
  CheckPlan,
  CheckPlanStep,
  CheckResult,
  CheckTimeRange,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckExecution,
  IgnoredFieldCause,
  IncreaseIgnoreAboveMitigation,
  Mitigation,
  MitigationForCause,
  MitigationParams,
  MitigationType,
  QualityProblem,
  QualityProblemCause,
  QualityProblemParams,
  QualityProblemType,
  RemoveFieldMitigation,
  TruncateValueMitigation,
} from './data_stream_quality_checks';
export type { FetchOptions } from './fetch_options';
export type { DatasetQualityConfig } from './plugin_config';
export {
  DATA_STREAM_CHECKS_PATH,
  DATA_STREAM_CHECK_PATH,
  DATA_STREAM_MITIGATION_PATH,
  DATA_STREAM_MITIGATIONS_PATH,
  getDataStreamCheckPath,
  getDatastreamCheckRequestParamsRT,
  getDatastreamCheckRequestPayloadRT,
  getDatastreamCheckResponsePayloadRT,
  getDataStreamChecksPath,
  getDatastreamChecksRequestParamsRT,
  getDatastreamChecksRequestPayloadRT,
  getDatastreamChecksResponsePayloadRT,
  getDataStreamMitigationsPath,
  getDatastreamMitigationsRequestParamsRT,
  getDatastreamMitigationsRequestPayloadRT,
  getDatastreamMitigationsResponsePayloadRT,
  getDataStreamMitigationPath,
  postDatastreamMitigationRequestParamsRT,
  postDatastreamMitigationRequestPayloadRT,
  postDatastreamMitigationResponsePayloadRT,
} from './rest';
export type {
  APIClientRequestParamsOf,
  APIReturnType,
  GetDatastreamCheckResponsePayload,
  GetDatastreamChecksResponsePayload,
  PostDatastreamMitigationResponsePayload,
} from './rest';
