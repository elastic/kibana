/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function mapConcurrentConnections(concurrents) {
  return _.reduce(_.values(concurrents), (result, value) => {
    return result + value;
  }, 0);
}
