/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocLinks } from '@kbn/doc-links';
import { Logger } from 'src/core/server';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../../common/constants';

/**
 * Helper method for building deprecation messages
 *
 * @param path Deprecated endpoint path
 * @returns string
 */
export const buildDeprecatedBulkEndpointMessage = (path: string) => {
  const docsLink = getDocLinks({ kibanaBranch: 'main' }).siem.ruleApiOverview;
  return `Deprecated endpoint: ${path} API is deprecated since v8.2. Please use the ${DETECTION_ENGINE_RULES_BULK_ACTION} API instead. See ${docsLink} for more detail.`;
};

/**
 * Logs usages of a deprecated bulk endpoint
 *
 * @param logger System logger
 * @param path Deprecated endpoint path
 */
export const logDeprecatedBulkEndpoint = (logger: Logger, path: string) => {
  logger.warn(buildDeprecatedBulkEndpointMessage(path), { tags: ['deprecation'] });
};

/**
 * Creates a warning header with a message formatted according to RFC7234.
 * We follow the same formatting as Elasticsearch
 * https://github.com/elastic/elasticsearch/blob/5baabff6670a8ed49297488ca8cac8ec12a2078d/server/src/main/java/org/elasticsearch/common/logging/HeaderWarning.java#L55
 *
 * @param path Deprecated endpoint path
 */
export const getDeprecatedBulkEndpointHeader = (path: string) => ({
  warning: `299 Kibana "${buildDeprecatedBulkEndpointMessage(path)}"`,
});
