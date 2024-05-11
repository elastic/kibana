/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RiskEngineAuditActions {
  RISK_ENGINE_ENABLE = 'risk_engine_enable',
  RISK_ENGINE_START = 'risk_engine_start',
  RISK_ENGINE_DISABLE = 'risk_engine_disable',
  RISK_ENGINE_INIT = 'risk_engine_init',
  RISK_ENGINE_GET_LEGACY_ENGINE_STATUS_GET = 'risk_engine_get_legacy_engine_status_get',
  RISK_ENGINE_STATUS_FOR_ALL_SPACES_GET = 'risk_engine_status_for_all_spaces_get',
  RISK_ENGINE_STATUS_GET = 'risk_engine_status_get',
  RISK_ENGINE_CONFIGURATION_GET = 'risk_engine_configuration_get',
  RISK_ENGINE_DISABLE_LEGACY_ENGINE = 'risk_engine_disable_legacy_engine',
  RISK_ENGINE_REMOVE_TASK = 'risk_engine_remove_task',
}
