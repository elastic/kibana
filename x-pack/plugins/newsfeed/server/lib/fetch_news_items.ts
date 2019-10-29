/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';
import { HttpResponseOptions } from '../../../../../src/core/server';

const NEWSFEED_SERVICE_URL_TEMPLATE = 'https://feeds.elastic.co/kibana/v7.4.1.json';

export function fetchNewsItems(kibanaVersion: string): Promise<HttpResponseOptions> {
  return new Promise((resolve, reject) => {
    request.get(
      NEWSFEED_SERVICE_URL_TEMPLATE.replace('VERSION', kibanaVersion),
      (err, httpResponse, body) => {
        if (err) {
          reject(err);
        }

        resolve(body);
      }
    );
  });
}
