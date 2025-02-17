/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { HEADERS, PASSWORD, USERNAME } from './constants';
import { getKibanaUrl } from './get_kibana_url';

export const createRule = async (ruleParams: any) => {
  const RULE_CREATION_API = `${await getKibanaUrl()}/api/alerting/rule`;
  return axios.post(RULE_CREATION_API, ruleParams, {
    headers: HEADERS,
    auth: {
      username: USERNAME,
      password: PASSWORD,
    },
  });
};
