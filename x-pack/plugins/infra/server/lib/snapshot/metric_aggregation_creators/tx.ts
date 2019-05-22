/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';
import { rate } from './rate';

const FIELDS = {
  [InfraNodeType.host]: 'system.network.out.bytes',
  [InfraNodeType.pod]: 'kubernetes.pod.network.tx.bytes',
  [InfraNodeType.container]: 'docker.network.out.bytes',
};

export const tx = rate('tx', FIELDS);
