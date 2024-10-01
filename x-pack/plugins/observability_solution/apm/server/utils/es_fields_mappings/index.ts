/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  metadataForDependencyMapping,
  transactionsForDependencySpansMapping,
  topDependencySpansMapping,
} from './dependency';
export { transactionMapping } from './transaction';
export { spanMapping } from './span';
export { serviceInstanceMetadataDetailsMapping } from './service_instance';
export { serviceMetadataDetailsMapping, serviceMetadataIconsMapping } from './service_metadata';
export { serviceAgentNameMapping, serviceVersionMapping } from './service';
export { spanLinksDetailsMapping, linkedParentsOfSpanMapping } from './span_links';
export { traceDocMapping } from './trace';
export {
  errorDocsMapping,
  errorGroupMainStatisticsMapping,
  errorSampleDetailsMapping,
} from './error';
export { cloudMapping } from './cloud';
export { containerMapping } from './container';
export { kubernetesMapping } from './kubernetes';
