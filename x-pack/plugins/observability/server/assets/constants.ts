/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLO_RESOURCES_VERSION = 2;

export const SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME = '.slo-observability.sli-mappings';
export const SLO_COMPONENT_TEMPLATE_SETTINGS_NAME = '.slo-observability.sli-settings';

export const SLO_INDEX_TEMPLATE_NAME = '.slo-observability.sli';
export const SLO_INDEX_TEMPLATE_PATTERN = `${SLO_INDEX_TEMPLATE_NAME}-*`;

export const SLO_DESTINATION_INDEX_NAME = `${SLO_INDEX_TEMPLATE_NAME}-v${SLO_RESOURCES_VERSION}`;
export const SLO_DESTINATION_INDEX_PATTERN = `${SLO_DESTINATION_INDEX_NAME}*`;

export const SLO_INGEST_PIPELINE_NAME = `${SLO_INDEX_TEMPLATE_NAME}.monthly`;
// slo-observability.sli-v<version>.(YYYY-MM-DD)
export const SLO_INGEST_PIPELINE_INDEX_NAME_PREFIX = `${SLO_DESTINATION_INDEX_NAME}.`;

export const SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME = '.slo-observability.summary-mappings';
export const SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME = '.slo-observability.summary-settings';
export const SLO_SUMMARY_INDEX_TEMPLATE_NAME = '.slo-observability.summary';
export const SLO_SUMMARY_INDEX_TEMPLATE_PATTERN = `${SLO_SUMMARY_INDEX_TEMPLATE_NAME}-*`;

export const getSLOTransformId = (sloId: string, sloRevision: number) =>
  `slo-${sloId}-${sloRevision}`;
