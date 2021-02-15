/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROUTES } from '../../../common/constants';

export class UpgradeService {
  constructor(http) {
    this.http = http;
  }

  executeUpgrade() {
    return this.http
      .post(`${ROUTES.API_ROOT}/upgrade`)
      .then((response) => response.is_upgraded)
      .catch((e) => {
        throw e.message;
      });
  }
}
