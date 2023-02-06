/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

export const getMonitor = async (kibanaUrl: string, monitorId: string) => {
  try {
    const response = await axios.get(kibanaUrl + `/internal/uptime/service/monitors/${monitorId}`, {
      auth: { username: 'elastic', password: 'changeme' },
      headers: { 'kbn-xsrf': 'true' },
    });
    return response.data.attributes;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};
