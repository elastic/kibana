/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import path from 'path';
import FormData from 'form-data';
import * as fs from 'fs';

export const importMonitors = async ({
  kibanaUrl,
  username,
  password,
}: {
  kibanaUrl: string;
  username?: string;
  password?: string;
}) => {
  // eslint-disable-next-line no-console
  console.log('Loading sample monitors');

  const form = new FormData();

  const file = fs.readFileSync(path.join(__dirname, './uptime_monitor.ndjson'));

  form.append('file', file, 'uptime_monitor.ndjson');

  try {
    axios
      .request({
        method: 'post',
        url: kibanaUrl + '/api/saved_objects/_import?overwrite=true',
        auth: { username: username ?? 'elastic', password: password ?? 'changeme' },
        headers: { 'kbn-xsrf': 'true', ...form.getHeaders() },
        data: form,
      })
      .then(({ data }) => {
        if (data.successCount === 2) {
          // eslint-disable-next-line no-console
          console.log('Successfully imported 2 monitors');
        }
      });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};
