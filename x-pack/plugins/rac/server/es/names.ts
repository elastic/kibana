/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALERTS_INDEX_BASE = `.alerts`;

export interface EsNames {
  base: string;
  alias: string;
  ilmPolicy: string;
  indexPattern: string;
  indexPatternWithVersion: string;
  initialIndex: string;
  indexTemplate: string;
}

export function getEsNames(baseName: string, kibanaVersion: string): EsNames {
  const VERSION_SUFFIX = `-${kibanaVersion.toLocaleLowerCase()}`;
  const indexName = `${baseName}${ALERTS_INDEX_BASE}`;
  const indexNameWithVersion = `${indexName}${VERSION_SUFFIX}`;
  const eventLogPolicyName = `${
    baseName.startsWith('.') ? baseName.substring(1) : baseName
  }${ALERTS_INDEX_BASE}-policy`;
  return {
    base: baseName,
    alias: indexNameWithVersion,
    ilmPolicy: `${eventLogPolicyName}`,
    indexPattern: `${indexName}-*`,
    indexPatternWithVersion: `${indexNameWithVersion}-*`,
    initialIndex: `${indexNameWithVersion}-000001`,
    indexTemplate: `${indexNameWithVersion}-template`,
  };
}
