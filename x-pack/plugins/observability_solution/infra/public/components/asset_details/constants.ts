/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DockerContainerMetrics, KubernetesContainerMetrics } from './charts/types';
import { INTEGRATION_NAME, ASSET_DETAILS_ASSET_TYPE } from './types';

export const ASSET_DETAILS_FLYOUT_COMPONENT_NAME = 'infraAssetDetailsFlyout';
export const ASSET_DETAILS_PAGE_COMPONENT_NAME = 'infraAssetDetailsPage';

export const APM_HOST_FILTER_FIELD = 'host.hostname';
export const APM_CONTAINER_FILTER_FIELD = 'container.id';

export const APM_FILTER_FIELD_PER_ASSET_TYPE = {
  [ASSET_DETAILS_ASSET_TYPE.container]: APM_CONTAINER_FILTER_FIELD,
  [ASSET_DETAILS_ASSET_TYPE.host]: APM_HOST_FILTER_FIELD,
};

export const ASSET_DETAILS_URL_STATE_KEY = 'assetDetails';

export const INTEGRATIONS = {
  [INTEGRATION_NAME.kubernetesNode]: 'kubernetes.node',
  [INTEGRATION_NAME.kubernetesContainer]: 'kubernetes.container',
  [INTEGRATION_NAME.docker]: 'docker',
};

export const DOCKER_METRIC_TYPES: DockerContainerMetrics[] = ['cpu', 'memory', 'network', 'disk'];
export const KUBERNETES_METRIC_TYPES: KubernetesContainerMetrics[] = ['cpu', 'memory'];
