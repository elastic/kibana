/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME = 'observability-slo-mappings';
export const SLO_COMPONENT_TEMPLATE_SETTINGS_NAME = 'observability-slo-settings';
export const SLO_INDEX_TEMPLATE_NAME = 'slo-observability.sli';
export const SLO_INGEST_PIPELINE_NAME = 'observability-slo-monthly-index';
export const SLO_RESOURCES_VERSION = 1;

export const getSLODestinationIndexName = (spaceId: string) =>
  `${SLO_INDEX_TEMPLATE_NAME}-v${SLO_RESOURCES_VERSION}-${spaceId}`;
