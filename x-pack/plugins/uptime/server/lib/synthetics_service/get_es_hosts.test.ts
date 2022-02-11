/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsHosts } from './get_es_hosts';
import { CloudSetup } from '../../../../cloud/server';

describe('getEsHostsTest', () => {
  const cloudSetup = {
    cloudId:
      'TLS_Test:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDI0ZDYwY2NjYmZjODRhZmZhNGRjYTQ3M2M2YjFlZDgwJGUxMjkyY2YzMTczZTRkNTViZDViM2NlNzYyZDg1NzY3',
    isCloudEnabled: true,
  } as CloudSetup;

  it('should return expected host in cloud', function () {
    const esHosts = getEsHosts({
      cloud: cloudSetup,
      config: {
        manifestUrl: 'https://testing.com',
      },
    });

    expect(esHosts).toEqual([
      'https://24d60cccbfc84affa4dca473c6b1ed80.us-central1.gcp.cloud.es.io:443',
    ]);
  });

  it('should return expected host from config', function () {
    const esHosts = getEsHosts({
      config: {
        manifestUrl: 'https://testing.com',
        hosts: ['http://localhost:9200'],
      },
    });

    expect(esHosts).toEqual(['http://localhost:9200']);
  });
  it('should return cloud hosts when both config and cloud are present', function () {
    const esHosts = getEsHosts({
      cloud: cloudSetup,
      config: {
        manifestUrl: 'https://testing.com',
        hosts: ['http://localhost:9200'],
      },
    });

    expect(esHosts).toEqual([
      'https://24d60cccbfc84affa4dca473c6b1ed80.us-central1.gcp.cloud.es.io:443',
    ]);
  });
});
