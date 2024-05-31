/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { HOST_NAME } from '../../../common/es_fields/apm';

export function hostNamesToKuery(hostNames: string[]) {
  return hostNames.reduce<string>((acc, hostName) => {
    if (isEmpty(acc)) {
      return `${HOST_NAME} : "${hostName}"`;
    }

    return `${acc} OR ${HOST_NAME} : "${hostName}"`;
  }, '');
}
