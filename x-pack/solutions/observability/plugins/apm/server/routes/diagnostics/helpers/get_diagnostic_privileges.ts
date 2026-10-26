/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getApmIndexPatterns } from '../bundle/get_indices';

/**
 * OTel index patterns owned by Agent Builder that are deliberately carved out of
 * the built-in serverless `viewer`/`editor` roles. These names
 * (`traces-agent_builder.otel-<spaceId>` / `logs-agent_builder.otel-<spaceId>`,
 * see `buildAgentBuilderTracesIndexPattern` in the agent_builder plugin) match
 * the broad `traces-*.otel-*` / `logs-*.otel-*` wildcards that APM Diagnostics
 * asserts `read` on.
 *
 * `security.hasPrivileges` only returns `true` for a wildcard when the privilege
 * is granted on *every* matching index, so a single inaccessible Agent Builder
 * index would otherwise flip the whole check to `false` and show a bogus
 * "Insufficient access" warning to users who can read the actual APM data.
 * Appending the matching exclusion makes the assertion ignore those carved-out
 * indices, which the Diagnostics tool never needs to read.
 *
 * See https://github.com/elastic/kibana/issues/272478
 */
const AGENT_BUILDER_OTEL_EXCLUSIONS: Record<string, string> = {
  'traces-*.otel-*': 'traces-agent_builder.otel-*',
  'logs-*.otel-*': 'logs-agent_builder.otel-*',
};

const excludeAgentBuilderOtelIndices = (pattern: string): string => {
  const exclusion = AGENT_BUILDER_OTEL_EXCLUSIONS[pattern];
  return exclusion ? `${pattern},-${exclusion}` : pattern;
};

export async function getDiagnosticsPrivileges({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  const indexPatterns = getApmIndexPatterns([
    apmIndices.error,
    apmIndices.metric,
    apmIndices.span,
    apmIndices.transaction,
  ]).map(excludeAgentBuilderOtelIndices);

  const clusterPrivileges = ['manage_index_templates', 'monitor', 'read_pipeline'];
  const { index, cluster } = await esClient.security.hasPrivileges({
    index: [
      {
        names: indexPatterns,
        privileges: ['read'],
      },
    ],
    cluster: clusterPrivileges,
  });

  const hasAllIndexPrivileges = Object.values(index).every((indexPrivs) =>
    Object.values(indexPrivs).every((priv) => priv)
  );

  const hasAllClusterPrivileges = Object.values(cluster).every((priv) => priv);

  return {
    index,
    cluster,
    hasAllIndexPrivileges,
    hasAllClusterPrivileges,
    hasAllPrivileges: hasAllIndexPrivileges && hasAllClusterPrivileges,
  };
}
