/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KUBERNETES_PATH = '/kubernetes' as const;
export const KUBERNETES_TITLE = 'Kubernetes';
export const LOCAL_STORAGE_HIDE_WIDGETS_KEY = 'kubernetesSecurity:shouldHideWidgets';

export const AGGREGATE_ROUTE = '/internal/kubernetes_security/aggregate';
export const COUNT_ROUTE = '/internal/kubernetes_security/count';
export const MULTI_TERMS_AGGREGATE_ROUTE = '/internal/kubernetes_security/multi_terms_aggregate';
export const AGENT_ID_ROUTE = '/internal/kubernetes_security/agent_id';
export const AGGREGATE_PAGE_SIZE = 10;

// so, bucket sort can only page through what we request at the top level agg, which means there is a ceiling to how many aggs we can page through.
// we should also test this approach at scale.
export const AGGREGATE_MAX_BUCKETS = 2000;

// react-query caching keys
export const QUERY_KEY_PERCENT_WIDGET = 'kubernetesSecurityPercentWidget';
export const QUERY_KEY_COUNT_WIDGET = 'kubernetesSecurityCountWidget';
export const QUERY_KEY_CONTAINER_NAME_WIDGET = 'kubernetesSecurityContainerNameWidget';
export const QUERY_KEY_PROCESS_EVENTS = 'kubernetesSecurityProcessEvents';
export const QUERY_KEY_AGENT_ID = 'kubernetesSecurityAgentId';

// ECS fields
export const ENTRY_LEADER_INTERACTIVE = 'process.entry_leader.interactive';
export const ENTRY_LEADER_USER_ID = 'process.entry_leader.user.id';
export const ENTRY_LEADER_ENTITY_ID = 'process.entry_leader.entity_id';

export const ORCHESTRATOR_CLUSTER_ID = 'orchestrator.cluster.id';
export const ORCHESTRATOR_CLUSTER_NAME = 'orchestrator.cluster.name';
export const ORCHESTRATOR_NAMESPACE = 'orchestrator.namespace';
export const CLOUD_INSTANCE_NAME = 'cloud.instance.name';
export const ORCHESTRATOR_RESOURCE_ID = 'orchestrator.resource.name';
export const CONTAINER_IMAGE_NAME = 'container.image.name';

export const COUNT_WIDGET_KEY_CLUSTERS = 'CountClustersWidget';
export const COUNT_WIDGET_KEY_NAMESPACE = 'CountNamespaceWidgets';
export const COUNT_WIDGET_KEY_NODES = 'CountNodesWidgets';
export const COUNT_WIDGET_KEY_PODS = 'CountPodsWidgets';
export const COUNT_WIDGET_KEY_CONTAINER_IMAGES = 'CountContainerImagesWidgets';

export const DEFAULT_QUERY = '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}';
export const DEFAULT_KUBERNETES_FILTER_QUERY =
  '{"bool":{"must":[],"filter":[{"bool": {"should": [{"exists": {"field": "orchestrator.cluster.id"}}]}}],"should":[],"must_not":[]}}';
export const DEFAULT_FILTER_QUERY =
  '{"bool":{"must":[],"filter":[{"bool": {"should": [{"exists": {"field": "process.entry_leader.entity_id"}}]}}],"should":[],"must_not":[]}}';
export const DEFAULT_FILTER = {
  bool: {
    should: [
      {
        exists: {
          field: ENTRY_LEADER_ENTITY_ID,
        },
      },
    ],
    minimum_should_match: 1,
  },
};
