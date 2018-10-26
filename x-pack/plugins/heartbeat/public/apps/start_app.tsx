/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosRequestConfig } from 'axios';
import React from 'react';
import { HeartbeatFrontendLibs } from '../lib/lib';

export async function startApp(libs: HeartbeatFrontendLibs) {
  libs.framework.render(
    <div>
      <button
        onClick={async () => {
          const res = await axios.get('/api/heartbeat/all');
          alert(JSON.stringify(res));
        }}
      >
        submit
      </button>
      <button
        onClick={async () => {
          const res = await axios({
            url: '/api/heartbeat/any',
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'kbn-xsrf': 'xxx',
            },
            data: {
              timeseries: {
                min: '2018-10-25T05:00:00',
                max: '2018-10-26T23:00:00',
              },
            },
          });
          alert(JSON.stringify(res));
        }}
      >
        getAll
      </button>
    </div>
  );
}
