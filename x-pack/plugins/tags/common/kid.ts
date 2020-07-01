/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Utilities to work with KIDs (Kibana IDs). Kibana ID is a global resource
 * identifier without a Kibana deployment.
 *
 * KID format:
 *
 * ```
 * kid:<space>:<plugin>:<service>:<path>
 * ```
 *
 * Consider an index pattern with ID 123, its ID in `indexPatterns` service in `data` plugin:
 *
 * ```
 * kid:default:data:ip:index_pattern/123
 * ```
 *
 * Index pattern is actually stored in saved object service, the KID
 * of that resource in saved object service:
 *
 * ```
 * kid:default::so:saved_object/index_pattern/123
 * ```
 */
export interface KID {
  space: string;
  plugin: string;
  service: string;
  path: string[];
}

export const parseKID = (str: string) => {
  if (typeof str !== 'string') throw new TypeError('KID must be a string.');
  if (str.length < 8) throw new Error('KID string too short.');
  if (str.length > 2048) throw new Error('KID stirng too long.');

  const parts = str.split(/[\/\:]/);

  if (parts.length < 5) throw new Error('Invalid number of parts in KID.');

  const [protocol, space, plugin, service, ...path] = parts;

  if (protocol !== 'kid') throw new Error('Expected KID protocol to be "kid".');

  return {
    space,
    plugin,
    service,
    path,
  };
};

export const formatKID = ({ space = '', plugin = '', service = '', path = [] }: KID): string => {
  return `kid:${space}:${plugin}:${service}:${path.join('/')}`;
};
