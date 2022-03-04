/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';
import type { ApmUrlParams } from '../../../../../context/url_params_context/types';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';

export const location = {
  pathname: '/services/opbeans-go/transactions/view',
  search:
    '?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0&kuery=service.name%253A%2520%2522opbeans-java%2522%2520or%2520service.name%2520%253A%2520%2522opbeans-go%2522&traceId=513d33fafe99bbe6134749310c9b5322&transactionId=975c8d5bfd1dd20b&transactionName=GET%20%2Fapi%2Forders&transactionType=request',
  hash: '',
} as Location;

type TraceAPIResponse = APIReturnType<'GET /internal/apm/traces/{traceId}'>;

export const urlParams = {
  start: '2020-03-22T15:16:38.742Z',
  end: '2020-03-23T15:16:38.742Z',
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: true,
  refreshInterval: 0,
  page: 0,
  transactionId: '975c8d5bfd1dd20b',
  traceId: '513d33fafe99bbe6134749310c9b5322',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  processorEvent: 'transaction',
  serviceName: 'opbeans-go',
} as ApmUrlParams;

export const simpleTrace = {
  traceDocs: [
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 46,
        },
      },
      source: {
        ip: '172.19.0.13',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: '172.19.0.9',
        full: 'http://172.19.0.9:3000/api/orders',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      http: {
        request: {
          headers: {
            Accept: ['*/*'],
            'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
            Host: ['172.19.0.9:3000'],
            'Accept-Encoding': ['gzip, deflate'],
          },
          method: 'get',
          socket: {
            encrypted: false,
            remote_address: '172.19.0.13',
          },
          body: {
            original: '[REDACTED]',
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': ['chunked'],
            Date: ['Mon, 23 Mar 2020 15:04:28 GMT'],
            'Content-Type': ['application/json;charset=ISO-8859-1'],
          },
          status_code: 200,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      client: {
        ip: '172.19.0.13',
      },
      transaction: {
        duration: {
          us: 18842,
        },
        result: 'HTTP 2xx',
        name: 'DispatcherServlet#doGet',
        id: '49809ad3c26adf74',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      user_agent: {
        original: 'Python/3.7 aiohttp/3.3.2',
        name: 'Other',
        device: {
          name: 'Other',
        },
      },
      timestamp: {
        us: 1584975868785000,
      },
    },
    {
      parent: {
        id: 'fc107f7b556eb49b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        framework: {
          name: 'gin',
          version: 'v1.4.0',
        },
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        duration: {
          us: 16597,
        },
        result: 'HTTP 2xx',
        name: 'GET /api/orders',
        id: '975c8d5bfd1dd20b',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      timestamp: {
        us: 1584975868787052,
      },
      faas: {
        coldstart: true,
      },
    },
    {
      parent: {
        id: 'daae24d83c269918',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      timestamp: {
        us: 1584975868788603,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      '@timestamp': '2020-03-23T15:04:28.788Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        result: 'HTTP 2xx',
        duration: {
          us: 14648,
        },
        name: 'GET opbeans.views.orders',
        span_count: {
          dropped: 0,
          started: 1,
        },
        id: '6fb0ff7365b87298',
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      parent: {
        id: '49809ad3c26adf74',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 44,
        },
      },
      destination: {
        address: 'opbeans-go',
        port: 3000,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        type: 'apm-server',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      connection: {
        hash: "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
      },
      transaction: {
        id: '49809ad3c26adf74',
      },
      timestamp: {
        us: 1584975868785273,
      },
      span: {
        duration: {
          us: 17530,
        },
        subtype: 'http',
        name: 'GET opbeans-go',
        destination: {
          service: {
            resource: 'opbeans-go:3000',
            name: 'http://opbeans-go:3000',
            type: 'external',
          },
        },
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-go:3000/api/orders',
          },
        },
        id: 'fc107f7b556eb49b',
        type: 'external',
      },
    },
    {
      parent: {
        id: '975c8d5bfd1dd20b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        id: '975c8d5bfd1dd20b',
      },
      timestamp: {
        us: 1584975868787174,
      },
      span: {
        duration: {
          us: 16250,
        },
        subtype: 'http',
        destination: {
          service: {
            resource: 'opbeans-python:3000',
            name: 'http://opbeans-python:3000',
            type: 'external',
          },
        },
        name: 'GET opbeans-python:3000',
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-python:3000/api/orders',
          },
        },
        id: 'daae24d83c269918',
        type: 'external',
      },
    },
    {
      container: {
        id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
      },
      parent: {
        id: '6fb0ff7365b87298',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.790Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        id: '6fb0ff7365b87298',
      },
      timestamp: {
        us: 1584975868790080,
      },
      span: {
        duration: {
          us: 2519,
        },
        subtype: 'postgresql',
        name: 'SELECT FROM opbeans_order',
        destination: {
          service: {
            resource: 'postgresql',
            name: 'postgresql',
            type: 'db',
          },
        },
        action: 'query',
        id: 'c9407abb4d08ead1',
        type: 'db',
        sync: true,
        db: {
          statement:
            'SELECT "opbeans_order"."id", "opbeans_order"."customer_id", "opbeans_customer"."full_name", "opbeans_order"."created_at" FROM "opbeans_order" INNER JOIN "opbeans_customer" ON ("opbeans_order"."customer_id" = "opbeans_customer"."id")  LIMIT 1000',
          type: 'sql',
        },
      },
    },
  ],
  exceedsMax: false,
  errorDocs: [],
} as TraceAPIResponse;

export const manyChildrenWithSameLength = {
  exceedsMax: false,
  traceDocs: [
    {
      container: {
        id: '46721e28e45ec1926798491069d8585865b031b4eaa9800e35d06fef6be5e170',
      },
      kubernetes: {
        pod: {
          uid: '900f3cac-eb7c-4308-9376-f644f173c3ee',
        },
      },
      process: {
        args: ['-C', 'config/puma.rb'],
        pid: 38,
        title: '/usr/local/bundle/bin/puma',
      },
      agent: {
        name: 'ruby',
        version: '4.3.0',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/products/3',
        scheme: 'http',
        port: 3000,
        domain: '10.15.245.224',
        full: 'http://10.15.245.224:3000/api/products/3',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'projects/8560181848/machineTypes/n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        node: {
          name: '46721e28e45ec1926798491069d8585865b031b4eaa9800e35d06fef6be5e170',
        },
        environment: 'production',
        framework: {
          name: 'Ruby on Rails',
          version: '6.1.4.1',
        },
        name: 'opbeans-ruby',
        runtime: {
          name: 'ruby',
          version: '2.7.3',
        },
        language: {
          name: 'ruby',
          version: '2.7.3',
        },
        version: '2021-10-14 17:49:53',
      },
      host: {
        os: {
          platform: 'linux',
        },
        ip: '10.12.0.22',
        architecture: 'x86_64',
      },
      http: {
        request: {
          headers: {
            Accept: ['*/*'],
            Version: ['HTTP/1.1'],
            'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
            Host: ['10.15.245.224:3000'],
            'Accept-Encoding': ['gzip, deflate'],
          },
          method: 'GET',
          env: {
            GATEWAY_INTERFACE: 'CGI/1.2',
            ORIGINAL_FULLPATH: '/api/products/3',
            SERVER_PORT: '3000',
            SERVER_PROTOCOL: 'HTTP/1.1',
            REMOTE_ADDR: '10.12.6.45',
            REQUEST_URI: '/api/products/3',
            ORIGINAL_SCRIPT_NAME: '',
            SERVER_SOFTWARE: 'puma 5.5.0 Zawgyi',
            QUERY_STRING: '',
            SCRIPT_NAME: '',
            REQUEST_METHOD: 'GET',
            SERVER_NAME: '10.15.245.224',
            REQUEST_PATH: '/api/products/3',
            PATH_INFO: '/api/products/3',
            ROUTES_9240_SCRIPT_NAME: '',
          },
          body: {
            original: '[SKIPPED]',
          },
        },
        response: {
          headers: {
            'Content-Type': ['application/json;charset=UTF-8'],
          },
          status_code: 500,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      event: {
        ingested: '2021-10-19T13:57:12.417144879Z',
        outcome: 'failure',
      },
      transaction: {
        duration: {
          us: 13359,
        },
        result: 'HTTP 5xx',
        name: 'Rack',
        span_count: {
          dropped: 0,
          started: 1,
        },
        id: '9a7f717439921d39',
        type: 'request',
        sampled: true,
      },
      user_agent: {
        original: 'Python/3.7 aiohttp/3.3.2',
        name: 'Python aiohttp',
        device: {
          name: 'Other',
          type: 'Other',
        },
        version: '3.3.2',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      container: {
        id: 'e7b69f99cb7523bedea6d7c97b684cf4b7ff458d0cba1efb1ac843300b3bf3c7',
      },
      kubernetes: {
        pod: {
          uid: 'c5169b50-f3b3-4693-8e4b-150fca17c333',
          name: 'opbeans-go-5d795ddf6b-rhlvf',
        },
      },
      parent: {
        id: '4eeaa6dfbfd047cd',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      source: {
        ip: '10.12.0.22',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        type: 'apm-server',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      host: {
        os: {
          platform: 'linux',
        },
        ip: '10.12.0.14',
        architecture: 'amd64',
      },
      client: {
        ip: '10.12.0.22',
      },
      event: {
        ingested: '2021-10-19T13:57:05.413190788Z',
        outcome: 'failure',
      },
      user_agent: {
        original: 'http.rb/5.0.2',
        name: 'Other',
        device: {
          name: 'Generic Feature Phone',
          type: 'Other',
        },
      },
      timestamp: {
        us: 1634651822536408,
      },
      process: {
        args: [
          '/opbeans-go',
          '-log-level=debug',
          '-log-json',
          '-listen=:3000',
          '-frontend=/opbeans-frontend',
          '-db=postgres:',
          '-cache=redis://redis-master:6379',
        ],
        pid: 1,
        title: 'opbeans-go',
        ppid: 0,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/products/3',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans',
        full: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      service: {
        node: {
          name: 'e7b69f99cb7523bedea6d7c97b684cf4b7ff458d0cba1efb1ac843300b3bf3c7',
        },
        environment: 'testing',
        framework: {
          name: 'gin',
          version: 'v1.7.3',
        },
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.17.2',
        },
        language: {
          name: 'go',
          version: 'go1.17.2',
        },
        version: '2021-10-14 17:49:50',
      },
      http: {
        request: {
          headers: {
            Connection: ['close'],
            'User-Agent': ['http.rb/5.0.2'],
            'Elastic-Apm-Traceparent': [
              '00-d5e80ae688f1fef91533f02dd2bdc769-4eeaa6dfbfd047cd-01',
            ],
            Tracestate: ['es=s:1.0'],
            Traceparent: [
              '00-d5e80ae688f1fef91533f02dd2bdc769-4eeaa6dfbfd047cd-01',
            ],
          },
          method: 'GET',
        },
        response: {
          headers: {
            Date: ['Tue, 19 Oct 2021 13:57:02 GMT'],
            'Content-Type': ['application/json;charset=UTF-8'],
          },
          status_code: 500,
        },
        version: '1.1',
      },
      transaction: {
        result: 'HTTP 5xx',
        duration: {
          us: 13359,
        },
        name: 'GET /api/products/:id',
        id: '9f50f43e924d0b46',
        span_count: {
          dropped: 0,
          started: 3,
        },
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: '015d1127421e2c3d42a0fb031fc75e989813f58973143b6c7e33dca6ccc6f31b',
      },
      parent: {
        id: '8d099ab4fcec4ab9',
      },
      kubernetes: {
        pod: {
          uid: '459a6abf-198e-4107-b4dd-b0ae826755ab',
          name: 'opbeans-go-nsn-69b89c4598-xsvgh',
        },
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      source: {
        ip: '10.12.0.14',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      host: {
        os: {
          platform: 'linux',
        },
        ip: '10.12.0.13',
        architecture: 'amd64',
      },
      client: {
        ip: '10.12.0.22',
      },
      event: {
        ingested: '2021-10-19T13:57:08.267103644Z',
        outcome: 'failure',
      },
      user_agent: {
        original: 'http.rb/5.0.2',
        name: 'Other',
        device: {
          name: 'Generic Feature Phone',
          type: 'Other',
        },
      },
      timestamp: {
        us: 1634651822536408,
      },
      process: {
        args: [
          '/opbeans-go',
          '-log-level=debug',
          '-log-json',
          '-listen=:3000',
          '-frontend=/opbeans-frontend',
          '-db=postgres:',
          '-cache=redis://redis-master:6379',
        ],
        pid: 1,
        title: 'opbeans-go',
        ppid: 0,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/products/3',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans',
        full: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      service: {
        node: {
          name: '015d1127421e2c3d42a0fb031fc75e989813f58973143b6c7e33dca6ccc6f31b',
        },
        environment: 'testing',
        framework: {
          name: 'gin',
          version: 'v1.7.3',
        },
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.17.2',
        },
        language: {
          name: 'go',
          version: 'go1.17.2',
        },
        version: '2021-10-14 17:49:50',
      },
      http: {
        request: {
          headers: {
            'User-Agent': ['http.rb/5.0.2'],
            'X-Forwarded-For': ['10.12.0.22'],
            'Accept-Encoding': ['gzip'],
            'Elastic-Apm-Traceparent': [
              '00-d5e80ae688f1fef91533f02dd2bdc769-8d099ab4fcec4ab9-01',
            ],
            Tracestate: ['es=s:1.0'],
            Traceparent: [
              '00-d5e80ae688f1fef91533f02dd2bdc769-8d099ab4fcec4ab9-01',
            ],
          },
          method: 'GET',
        },
        response: {
          headers: {
            Date: ['Tue, 19 Oct 2021 13:57:02 GMT'],
            'Content-Type': ['application/json;charset=UTF-8'],
          },
          status_code: 500,
        },
        version: '1.1',
      },
      transaction: {
        result: 'HTTP 5xx',
        duration: {
          us: 13359,
        },
        name: 'GET /api/products/:id',
        span_count: {
          dropped: 0,
          started: 3,
        },
        id: 'b7801be83bcdc972',
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: '59036ecb70908dfec4e03edc477f6875d08677871b4af0db3144373802d00cb1',
      },
      kubernetes: {
        pod: {
          uid: '878bab2a-1309-44ae-a0e2-c98a0b187da1',
          name: 'opbeans-java-5f45d77dd8-h8bnb',
        },
      },
      parent: {
        id: '35e3637e26919055',
      },
      agent: {
        name: 'java',
        ephemeral_id: '75e36588-9adb-4bb0-bfee-a333b1c57e67',
        version: 'unknown',
      },
      source: {
        ip: '10.12.0.13',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      host: {
        os: {
          platform: 'Linux',
        },
        ip: '10.12.0.15',
        architecture: 'amd64',
      },
      client: {
        ip: '10.12.0.22',
      },
      event: {
        ingested: '2021-10-19T13:57:10.382829210Z',
        outcome: 'failure',
      },
      user_agent: {
        original: 'http.rb/5.0.2',
        name: 'Other',
        device: {
          name: 'Generic Feature Phone',
          type: 'Other',
        },
      },
      timestamp: {
        us: 1634651822536408,
      },
      process: {
        pid: 7,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/products/3',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans',
        full: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      service: {
        node: {
          name: '59036ecb70908dfec4e03edc477f6875d08677871b4af0db3144373802d00cb1',
        },
        environment: 'production',
        framework: {
          name: 'Spring Web MVC',
          version: '5.0.6.RELEASE',
        },
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.11',
        },
        language: {
          name: 'Java',
          version: '11.0.11',
        },
        version: '2021-10-14 17:49:52',
      },
      http: {
        request: {
          headers: {
            'User-Agent': ['http.rb/5.0.2'],
            'X-Forwarded-For': ['10.12.0.22, 10.12.0.14'],
            Host: ['opbeans:3000'],
            'Accept-Encoding': ['gzip'],
            'Elastic-Apm-Traceparent': [
              '00-d5e80ae688f1fef91533f02dd2bdc769-35e3637e26919055-01',
            ],
            Tracestate: ['es=s:1.0'],
            Traceparent: [
              '00-d5e80ae688f1fef91533f02dd2bdc769-35e3637e26919055-01',
            ],
          },
          method: 'GET',
        },
        response: {
          status_code: 500,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      transaction: {
        duration: {
          us: 13359,
        },
        result: 'HTTP 5xx',
        name: 'APIRestController#product',
        id: '2c30263c4ad8fe8b',
        span_count: {
          dropped: 0,
          started: 3,
        },
        type: 'request',
        sampled: true,
      },
    },
    {
      parent: {
        id: '9a7f717439921d39',
      },
      agent: {
        name: 'ruby',
        version: '4.3.0',
      },
      destination: {
        address: 'opbeans',
        port: 3000,
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'projects/8560181848/machineTypes/n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      event: {
        outcome: 'failure',
      },
      timestamp: {
        us: 1634651822536408,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      url: {
        original: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      service: {
        environment: 'production',
        name: 'opbeans-ruby',
      },
      http: {
        request: {
          method: 'GET',
        },
        response: {
          status_code: 500,
        },
      },
      transaction: {
        id: '9a7f717439921d39',
      },
      span: {
        duration: {
          us: 13359,
        },
        stacktrace: [
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'elastic_apm.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-4.3.0/lib/elastic_apm.rb',
            line: {
              number: 235,
            },
            function: 'tap',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'elastic_apm.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-4.3.0/lib/elastic_apm.rb',
            line: {
              number: 235,
            },
            function: 'start_span',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'elastic_apm.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-4.3.0/lib/elastic_apm.rb',
            line: {
              number: 287,
            },
            function: 'with_span',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'elastic_apm/spies/http.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-4.3.0/lib/elastic_apm/spies/http.rb',
            line: {
              number: 45,
            },
            function: 'perform',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/usr/local/bundle/gems/http-5.0.2/lib/http/client.rb',
            filename: 'http/client.rb',
            line: {
              number: 31,
            },
            function: 'request',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'http/chainable.rb',
            abs_path: '/usr/local/bundle/gems/http-5.0.2/lib/http/chainable.rb',
            line: {
              number: 75,
            },
            function: 'request',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'http/chainable.rb',
            abs_path: '/usr/local/bundle/gems/http-5.0.2/lib/http/chainable.rb',
            line: {
              number: 20,
            },
            function: 'get',
          },
          {
            exclude_from_grouping: false,
            filename: 'opbeans_shuffle.rb',
            abs_path: '/app/lib/opbeans_shuffle.rb',
            line: {
              number: 23,
              context: '        resp = HTTP.get("#{lucky_winner}#{path}")\n',
            },
            function: 'block in call',
            context: {
              pre: ['\n', '      Timeout.timeout(15) do\n'],
              post: ['\n', '        [\n'],
            },
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'timeout.rb',
            abs_path: '/usr/local/lib/ruby/2.7.0/timeout.rb',
            line: {
              number: 95,
            },
            function: 'block in timeout',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'timeout.rb',
            abs_path: '/usr/local/lib/ruby/2.7.0/timeout.rb',
            line: {
              number: 33,
            },
            function: 'block in catch',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/usr/local/lib/ruby/2.7.0/timeout.rb',
            filename: 'timeout.rb',
            line: {
              number: 33,
            },
            function: 'catch',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'timeout.rb',
            abs_path: '/usr/local/lib/ruby/2.7.0/timeout.rb',
            line: {
              number: 33,
            },
            function: 'catch',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'timeout.rb',
            abs_path: '/usr/local/lib/ruby/2.7.0/timeout.rb',
            line: {
              number: 110,
            },
            function: 'timeout',
          },
          {
            exclude_from_grouping: false,
            filename: 'opbeans_shuffle.rb',
            abs_path: '/app/lib/opbeans_shuffle.rb',
            line: {
              number: 22,
              context: '      Timeout.timeout(15) do\n',
            },
            function: 'call',
            context: {
              pre: ['      end\n', '\n'],
              post: [
                '        resp = HTTP.get("#{lucky_winner}#{path}")\n',
                '\n',
              ],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'elastic_apm/middleware.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-4.3.0/lib/elastic_apm/middleware.rb',
            line: {
              number: 36,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rails/engine.rb',
            abs_path:
              '/usr/local/bundle/gems/railties-6.1.4.1/lib/rails/engine.rb',
            line: {
              number: 539,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'puma/configuration.rb',
            abs_path:
              '/usr/local/bundle/gems/puma-5.5.0/lib/puma/configuration.rb',
            line: {
              number: 249,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/usr/local/bundle/gems/puma-5.5.0/lib/puma/request.rb',
            filename: 'puma/request.rb',
            line: {
              number: 77,
            },
            function: 'block in handle_request',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'puma/thread_pool.rb',
            abs_path:
              '/usr/local/bundle/gems/puma-5.5.0/lib/puma/thread_pool.rb',
            line: {
              number: 340,
            },
            function: 'with_force_shutdown',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'puma/request.rb',
            abs_path: '/usr/local/bundle/gems/puma-5.5.0/lib/puma/request.rb',
            line: {
              number: 76,
            },
            function: 'handle_request',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'puma/server.rb',
            abs_path: '/usr/local/bundle/gems/puma-5.5.0/lib/puma/server.rb',
            line: {
              number: 447,
            },
            function: 'process_client',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'puma/thread_pool.rb',
            abs_path:
              '/usr/local/bundle/gems/puma-5.5.0/lib/puma/thread_pool.rb',
            line: {
              number: 147,
            },
            function: 'block in spawn_thread',
          },
        ],
        subtype: 'http',
        destination: {
          service: {
            resource: 'opbeans:3000',
            name: 'http',
            type: 'external',
          },
        },
        name: 'GET opbeans',
        http: {
          method: 'GET',
          response: {
            status_code: 500,
          },
        },
        'http.url.original': 'http://opbeans:3000/api/products/3',
        id: '4eeaa6dfbfd047cd',
        type: 'external',
      },
    },
    {
      parent: {
        id: '9f50f43e924d0b46',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      destination: {
        address: 'opbeans',
        port: 3000,
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      event: {
        outcome: 'failure',
      },
      timestamp: {
        us: 1634651822536408,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      url: {
        original: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.536Z',
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      http: {
        response: {
          status_code: 500,
        },
      },
      transaction: {
        id: '9f50f43e924d0b46',
      },
      span: {
        duration: {
          us: 13359,
        },
        stacktrace: [
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'span.go',
            abs_path: '/go/pkg/mod/go.elastic.co/apm@v1.14.0/span.go',
            line: {
              number: 334,
            },
            module: 'go.elastic.co/apm',
            function: '(*Span).End',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'client.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/client.go',
            line: {
              number: 198,
            },
            module: 'go.elastic.co/apm/module/apmhttp',
            function: '(*responseBody).endSpan',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'client.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/client.go',
            line: {
              number: 187,
            },
            function: '(*responseBody).Read',
            module: 'go.elastic.co/apm/module/apmhttp',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 461,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).copyBuffer',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 449,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).copyResponse',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 338,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).ServeHTTP',
          },
          {
            exclude_from_grouping: false,
            filename: 'main.go',
            abs_path: '/src/opbeans-go/main.go',
            line: {
              number: 196,
            },
            module: 'main',
            function: 'Main.func2',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            filename: 'context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            exclude_from_grouping: false,
            filename: 'main.go',
            abs_path: '/src/opbeans-go/main.go',
            line: {
              number: 174,
            },
            module: 'main',
            function: 'Main.func1',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            exclude_from_grouping: false,
            filename: 'logger.go',
            abs_path: '/src/opbeans-go/logger.go',
            line: {
              number: 36,
            },
            module: 'main',
            function: 'logrusMiddleware',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'middleware.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmgin@v1.14.0/middleware.go',
            line: {
              number: 98,
            },
            module: 'go.elastic.co/apm/module/apmgin',
            function: '(*middleware).handle',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'cache.go',
            abs_path:
              '/go/pkg/mod/github.com/gin-contrib/cache@v1.1.0/cache.go',
            line: {
              number: 128,
            },
            module: 'github.com/gin-contrib/cache',
            function: 'Cache.func1',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'gin.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
            line: {
              number: 489,
            },
            function: '(*Engine).handleHTTPRequest',
            module: 'github.com/gin-gonic/gin',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'gin.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
            line: {
              number: 445,
            },
            function: '(*Engine).ServeHTTP',
            module: 'github.com/gin-gonic/gin',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'server.go',
            abs_path: '/usr/local/go/src/net/http/server.go',
            line: {
              number: 2878,
            },
            module: 'net/http',
            function: 'serverHandler.ServeHTTP',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'server.go',
            abs_path: '/usr/local/go/src/net/http/server.go',
            line: {
              number: 1929,
            },
            module: 'net/http',
            function: '(*conn).serve',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'asm_amd64.s',
            abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
            line: {
              number: 1581,
            },
            module: 'runtime',
            function: 'goexit',
          },
        ],
        subtype: 'http',
        name: 'GET opbeans:3000',
        destination: {
          service: {
            resource: 'opbeans:3000',
            name: 'http://opbeans:3000',
            type: 'external',
          },
        },
        http: {
          response: {
            status_code: 500,
          },
        },
        'http.url.original': 'http://opbeans:3000/api/products/3',
        id: '8d099ab4fcec4ab9',
        type: 'external',
      },
    },
    {
      parent: {
        id: '86c43ac014573747',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        type: 'apm-server',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.539Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      event: {
        outcome: 'unknown',
      },
      transaction: {
        id: '9f50f43e924d0b46',
      },
      span: {
        duration: {
          us: 13359,
        },
        stacktrace: [
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'span.go',
            abs_path: '/go/pkg/mod/go.elastic.co/apm@v1.14.0/span.go',
            line: {
              number: 334,
            },
            module: 'go.elastic.co/apm',
            function: '(*Span).End',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'clienttrace.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/clienttrace.go',
            line: {
              number: 130,
            },
            module: 'go.elastic.co/apm/module/apmhttp',
            function: 'withClientTrace.func8',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'transport.go',
            abs_path: '/usr/local/go/src/net/http/transport.go',
            line: {
              number: 2272,
            },
            function: '(*persistConn).readResponse',
            module: 'net/http',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'transport.go',
            abs_path: '/usr/local/go/src/net/http/transport.go',
            line: {
              number: 2102,
            },
            function: '(*persistConn).readLoop',
            module: 'net/http',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'asm_amd64.s',
            abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
            line: {
              number: 1581,
            },
            module: 'runtime',
            function: 'goexit',
          },
        ],
        subtype: 'http',
        name: 'Request',
        action: 'request',
        id: '997cdcc26a60d0ad',
        type: 'external',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      parent: {
        id: 'b7801be83bcdc972',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      destination: {
        address: 'opbeans',
        port: 3000,
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      event: {
        outcome: 'failure',
      },
      timestamp: {
        us: 1634651822536408,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      url: {
        original: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.539Z',
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      http: {
        response: {
          status_code: 500,
        },
      },
      transaction: {
        id: 'b7801be83bcdc972',
      },
      span: {
        duration: {
          us: 13359,
        },
        stacktrace: [
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'span.go',
            abs_path: '/go/pkg/mod/go.elastic.co/apm@v1.14.0/span.go',
            line: {
              number: 334,
            },
            module: 'go.elastic.co/apm',
            function: '(*Span).End',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'client.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/client.go',
            line: {
              number: 198,
            },
            module: 'go.elastic.co/apm/module/apmhttp',
            function: '(*responseBody).endSpan',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'client.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/client.go',
            line: {
              number: 187,
            },
            module: 'go.elastic.co/apm/module/apmhttp',
            function: '(*responseBody).Read',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 461,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).copyBuffer',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 449,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).copyResponse',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'reverseproxy.go',
            abs_path: '/usr/local/go/src/net/http/httputil/reverseproxy.go',
            line: {
              number: 338,
            },
            module: 'net/http/httputil',
            function: '(*ReverseProxy).ServeHTTP',
          },
          {
            exclude_from_grouping: false,
            filename: 'main.go',
            abs_path: '/src/opbeans-go/main.go',
            line: {
              number: 196,
            },
            module: 'main',
            function: 'Main.func2',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            exclude_from_grouping: false,
            filename: 'main.go',
            abs_path: '/src/opbeans-go/main.go',
            line: {
              number: 174,
            },
            module: 'main',
            function: 'Main.func1',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            exclude_from_grouping: false,
            filename: 'logger.go',
            abs_path: '/src/opbeans-go/logger.go',
            line: {
              number: 36,
            },
            module: 'main',
            function: 'logrusMiddleware',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'middleware.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmgin@v1.14.0/middleware.go',
            line: {
              number: 98,
            },
            function: '(*middleware).handle',
            module: 'go.elastic.co/apm/module/apmgin',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Context).Next',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/go/pkg/mod/github.com/gin-contrib/cache@v1.1.0/cache.go',
            filename: 'cache.go',
            line: {
              number: 128,
            },
            module: 'github.com/gin-contrib/cache',
            function: 'Cache.func1',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'context.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
            line: {
              number: 165,
            },
            function: '(*Context).Next',
            module: 'github.com/gin-gonic/gin',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'gin.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
            line: {
              number: 489,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Engine).handleHTTPRequest',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'gin.go',
            abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
            line: {
              number: 445,
            },
            module: 'github.com/gin-gonic/gin',
            function: '(*Engine).ServeHTTP',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/usr/local/go/src/net/http/server.go',
            filename: 'server.go',
            line: {
              number: 2878,
            },
            module: 'net/http',
            function: 'serverHandler.ServeHTTP',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: '/usr/local/go/src/net/http/server.go',
            filename: 'server.go',
            line: {
              number: 1929,
            },
            module: 'net/http',
            function: '(*conn).serve',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'asm_amd64.s',
            abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
            line: {
              number: 1581,
            },
            module: 'runtime',
            function: 'goexit',
          },
        ],
        subtype: 'http',
        name: 'GET opbeans:3000',
        destination: {
          service: {
            resource: 'opbeans:3000',
            name: 'http://opbeans:3000',
            type: 'external',
          },
        },
        http: {
          response: {
            status_code: 500,
          },
        },
        'http.url.original': 'http://opbeans:3000/api/products/3',
        id: '35e3637e26919055',
        type: 'external',
      },
    },
    {
      parent: {
        id: '84749ec73b1268b3',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        type: 'apm-server',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.539Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      event: {
        outcome: 'unknown',
      },
      transaction: {
        id: 'b7801be83bcdc972',
      },
      span: {
        duration: {
          us: 13359,
        },
        stacktrace: [
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'span.go',
            abs_path: '/go/pkg/mod/go.elastic.co/apm@v1.14.0/span.go',
            line: {
              number: 334,
            },
            module: 'go.elastic.co/apm',
            function: '(*Span).End',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'clienttrace.go',
            abs_path:
              '/go/pkg/mod/go.elastic.co/apm/module/apmhttp@v1.14.0/clienttrace.go',
            line: {
              number: 130,
            },
            module: 'go.elastic.co/apm/module/apmhttp',
            function: 'withClientTrace.func8',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'transport.go',
            abs_path: '/usr/local/go/src/net/http/transport.go',
            line: {
              number: 2272,
            },
            module: 'net/http',
            function: '(*persistConn).readResponse',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'transport.go',
            abs_path: '/usr/local/go/src/net/http/transport.go',
            line: {
              number: 2102,
            },
            module: 'net/http',
            function: '(*persistConn).readLoop',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'asm_amd64.s',
            abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
            line: {
              number: 1581,
            },
            module: 'runtime',
            function: 'goexit',
          },
        ],
        subtype: 'http',
        name: 'Request',
        action: 'request',
        id: 'a9b4d44c3d699cbb',
        type: 'external',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      parent: {
        id: '2c30263c4ad8fe8b',
      },
      agent: {
        name: 'java',
        ephemeral_id: '75e36588-9adb-4bb0-bfee-a333b1c57e67',
        version: 'unknown',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      labels: {
        productId: '3',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.540Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'production',
        name: 'opbeans-java',
      },
      event: {
        outcome: 'success',
      },
      transaction: {
        id: '2c30263c4ad8fe8b',
      },
      span: {
        duration: {
          us: 13359,
        },
        name: 'OpenTracing product span',
        id: 'd22c1e48b2489017',
        type: 'custom',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      parent: {
        id: 'd22c1e48b2489017',
      },
      agent: {
        name: 'java',
        ephemeral_id: '75e36588-9adb-4bb0-bfee-a333b1c57e67',
        version: 'unknown',
      },
      destination: {
        address: 'db-postgresql',
        port: 5432,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        type: 'apm-server',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.542Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'production',
        name: 'opbeans-java',
      },
      event: {
        outcome: 'success',
      },
      transaction: {
        id: '2c30263c4ad8fe8b',
      },
      timestamp: {
        us: 1634651822536408,
      },
      span: {
        duration: {
          us: 13359,
        },
        subtype: 'postgresql',
        destination: {
          service: {
            resource: 'postgresql',
          },
        },
        name: 'SELECT FROM products',
        action: 'query',
        id: '3851260ca4365f9e',
        type: 'db',
        db: {
          instance: 'opbeans-java',
          statement:
            'select product0_.id as col_0_0_, product0_.sku as col_1_0_, product0_.name as col_2_0_, product0_.description as col_3_0_, product0_.cost as col_4_0_, product0_.selling_price as col_5_0_, product0_.stock as col_6_0_, producttyp1_.id as col_7_0_, producttyp1_.name as col_8_0_, (select sum(orderline2_.amount) from order_lines orderline2_ where orderline2_.product_id=product0_.id) as col_9_0_ from products product0_ left outer join product_types producttyp1_ on product0_.type_id=producttyp1_.id where product0_.id=?',
          type: 'sql',
          user: {
            name: 'elastic',
          },
        },
      },
    },
    {
      parent: {
        id: '3851260ca4365f9e',
      },
      agent: {
        name: 'java',
        ephemeral_id: '75e36588-9adb-4bb0-bfee-a333b1c57e67',
        version: 'unknown',
      },
      destination: {
        address: 'db-postgresql',
        port: 5432,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        type: 'apm-server',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.541Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'production',
        name: 'opbeans-java',
      },
      event: {
        outcome: 'success',
      },
      transaction: {
        id: '2c30263c4ad8fe8b',
      },
      span: {
        duration: {
          us: 13359,
        },
        subtype: 'postgresql',
        destination: {
          service: {
            resource: 'postgresql',
          },
        },
        name: 'empty query',
        action: 'query',
        id: '86c43ac014573747',
        type: 'db',
        db: {
          rows_affected: 0,
          instance: 'opbeans-java',
          statement: '(empty query)',
          type: 'sql',
          user: {
            name: 'elastic',
          },
        },
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      parent: {
        id: '997cdcc26a60d0ad',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        type: 'apm-server',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.548Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      event: {
        outcome: 'unknown',
      },
      transaction: {
        id: '9f50f43e924d0b46',
      },
      timestamp: {
        us: 1634651822536408,
      },
      span: {
        duration: {
          us: 13359,
        },
        subtype: 'http',
        name: 'Response',
        action: 'response',
        id: '84749ec73b1268b3',
        type: 'external',
      },
    },
    {
      parent: {
        id: 'a9b4d44c3d699cbb',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        type: 'apm-server',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.547Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        environment: 'testing',
        name: 'opbeans-go',
      },
      event: {
        outcome: 'unknown',
      },
      transaction: {
        id: 'b7801be83bcdc972',
      },
      span: {
        duration: {
          us: 13359,
        },
        subtype: 'http',
        name: 'Response',
        action: 'response',
        id: '04991f3b9d3696c5',
        type: 'external',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
  ],
  errorDocs: [
    {
      container: {
        id: '59036ecb70908dfec4e03edc477f6875d08677871b4af0db3144373802d00cb1',
      },
      kubernetes: {
        pod: {
          uid: '878bab2a-1309-44ae-a0e2-c98a0b187da1',
          name: 'opbeans-java-5f45d77dd8-h8bnb',
        },
      },
      parent: {
        id: '2c30263c4ad8fe8b',
      },
      agent: {
        name: 'java',
        ephemeral_id: '75e36588-9adb-4bb0-bfee-a333b1c57e67',
        version: 'unknown',
      },
      source: {
        ip: '10.12.0.13',
      },
      error: {
        exception: [
          {
            stacktrace: [
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'AbstractMessageConverterMethodProcessor.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.annotation.AbstractMessageConverterMethodProcessor',
                line: {
                  number: 226,
                },
                module: 'org.springframework.web.servlet.mvc.method.annotation',
                function: 'writeWithMessageConverters',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'RequestResponseBodyMethodProcessor.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor',
                line: {
                  number: 180,
                },
                module: 'org.springframework.web.servlet.mvc.method.annotation',
                function: 'handleReturnValue',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'HandlerMethodReturnValueHandlerComposite.java',
                classname:
                  'org.springframework.web.method.support.HandlerMethodReturnValueHandlerComposite',
                line: {
                  number: 82,
                },
                module: 'org.springframework.web.method.support',
                function: 'handleReturnValue',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ServletInvocableHandlerMethod.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod',
                line: {
                  number: 119,
                },
                module: 'org.springframework.web.servlet.mvc.method.annotation',
                function: 'invokeAndHandle',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'RequestMappingHandlerAdapter.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter',
                line: {
                  number: 877,
                },
                function: 'invokeHandlerMethod',
                module: 'org.springframework.web.servlet.mvc.method.annotation',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'RequestMappingHandlerAdapter.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter',
                line: {
                  number: 783,
                },
                module: 'org.springframework.web.servlet.mvc.method.annotation',
                function: 'handleInternal',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'AbstractHandlerMethodAdapter.java',
                classname:
                  'org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter',
                line: {
                  number: 87,
                },
                module: 'org.springframework.web.servlet.mvc.method',
                function: 'handle',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'DispatcherServlet.java',
                classname: 'org.springframework.web.servlet.DispatcherServlet',
                line: {
                  number: 991,
                },
                function: 'doDispatch',
                module: 'org.springframework.web.servlet',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'DispatcherServlet.java',
                classname: 'org.springframework.web.servlet.DispatcherServlet',
                line: {
                  number: 925,
                },
                module: 'org.springframework.web.servlet',
                function: 'doService',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'FrameworkServlet.java',
                classname: 'org.springframework.web.servlet.FrameworkServlet',
                line: {
                  number: 974,
                },
                module: 'org.springframework.web.servlet',
                function: 'processRequest',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'FrameworkServlet.java',
                classname: 'org.springframework.web.servlet.FrameworkServlet',
                line: {
                  number: 866,
                },
                module: 'org.springframework.web.servlet',
                function: 'doGet',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'HttpServlet.java',
                classname: 'javax.servlet.http.HttpServlet',
                line: {
                  number: 635,
                },
                module: 'javax.servlet.http',
                function: 'service',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'FrameworkServlet.java',
                classname: 'org.springframework.web.servlet.FrameworkServlet',
                line: {
                  number: 851,
                },
                function: 'service',
                module: 'org.springframework.web.servlet',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'HttpServlet.java',
                classname: 'javax.servlet.http.HttpServlet',
                line: {
                  number: 742,
                },
                module: 'javax.servlet.http',
                function: 'service',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 231,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'WsFilter.java',
                classname: 'org.apache.tomcat.websocket.server.WsFilter',
                line: {
                  number: 52,
                },
                module: 'org.apache.tomcat.websocket.server',
                function: 'doFilter',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 193,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'RequestContextFilter.java',
                classname:
                  'org.springframework.web.filter.RequestContextFilter',
                line: {
                  number: 99,
                },
                function: 'doFilterInternal',
                module: 'org.springframework.web.filter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'OncePerRequestFilter.java',
                classname:
                  'org.springframework.web.filter.OncePerRequestFilter',
                line: {
                  number: 107,
                },
                module: 'org.springframework.web.filter',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 193,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'HttpPutFormContentFilter.java',
                classname:
                  'org.springframework.web.filter.HttpPutFormContentFilter',
                line: {
                  number: 109,
                },
                function: 'doFilterInternal',
                module: 'org.springframework.web.filter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'OncePerRequestFilter.java',
                classname:
                  'org.springframework.web.filter.OncePerRequestFilter',
                line: {
                  number: 107,
                },
                module: 'org.springframework.web.filter',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 193,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'HiddenHttpMethodFilter.java',
                classname:
                  'org.springframework.web.filter.HiddenHttpMethodFilter',
                line: {
                  number: 81,
                },
                function: 'doFilterInternal',
                module: 'org.springframework.web.filter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'OncePerRequestFilter.java',
                classname:
                  'org.springframework.web.filter.OncePerRequestFilter',
                line: {
                  number: 107,
                },
                module: 'org.springframework.web.filter',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 193,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'CharacterEncodingFilter.java',
                classname:
                  'org.springframework.web.filter.CharacterEncodingFilter',
                line: {
                  number: 200,
                },
                module: 'org.springframework.web.filter',
                function: 'doFilterInternal',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'OncePerRequestFilter.java',
                classname:
                  'org.springframework.web.filter.OncePerRequestFilter',
                line: {
                  number: 107,
                },
                module: 'org.springframework.web.filter',
                function: 'doFilter',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 193,
                },
                module: 'org.apache.catalina.core',
                function: 'internalDoFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ApplicationFilterChain.java',
                classname: 'org.apache.catalina.core.ApplicationFilterChain',
                line: {
                  number: 166,
                },
                module: 'org.apache.catalina.core',
                function: 'doFilter',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'StandardWrapperValve.java',
                classname: 'org.apache.catalina.core.StandardWrapperValve',
                line: {
                  number: 198,
                },
                module: 'org.apache.catalina.core',
                function: 'invoke',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'StandardContextValve.java',
                classname: 'org.apache.catalina.core.StandardContextValve',
                line: {
                  number: 96,
                },
                module: 'org.apache.catalina.core',
                function: 'invoke',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'AuthenticatorBase.java',
                classname:
                  'org.apache.catalina.authenticator.AuthenticatorBase',
                line: {
                  number: 496,
                },
                module: 'org.apache.catalina.authenticator',
                function: 'invoke',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'StandardHostValve.java',
                classname: 'org.apache.catalina.core.StandardHostValve',
                line: {
                  number: 140,
                },
                module: 'org.apache.catalina.core',
                function: 'invoke',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'ErrorReportValve.java',
                classname: 'org.apache.catalina.valves.ErrorReportValve',
                line: {
                  number: 81,
                },
                module: 'org.apache.catalina.valves',
                function: 'invoke',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'StandardEngineValve.java',
                classname: 'org.apache.catalina.core.StandardEngineValve',
                line: {
                  number: 87,
                },
                module: 'org.apache.catalina.core',
                function: 'invoke',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'CoyoteAdapter.java',
                classname: 'org.apache.catalina.connector.CoyoteAdapter',
                line: {
                  number: 342,
                },
                module: 'org.apache.catalina.connector',
                function: 'service',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'Http11Processor.java',
                classname: 'org.apache.coyote.http11.Http11Processor',
                line: {
                  number: 803,
                },
                module: 'org.apache.coyote.http11',
                function: 'service',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'AbstractProcessorLight.java',
                classname: 'org.apache.coyote.AbstractProcessorLight',
                line: {
                  number: 66,
                },
                module: 'org.apache.coyote',
                function: 'process',
              },
              {
                exclude_from_grouping: false,
                library_frame: true,
                filename: 'AbstractProtocol.java',
                classname:
                  'org.apache.coyote.AbstractProtocol$ConnectionHandler',
                line: {
                  number: 790,
                },
                module: 'org.apache.coyote',
                function: 'process',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'NioEndpoint.java',
                classname:
                  'org.apache.tomcat.util.net.NioEndpoint$SocketProcessor',
                line: {
                  number: 1468,
                },
                module: 'org.apache.tomcat.util.net',
                function: 'doRun',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'SocketProcessorBase.java',
                classname: 'org.apache.tomcat.util.net.SocketProcessorBase',
                line: {
                  number: 49,
                },
                module: 'org.apache.tomcat.util.net',
                function: 'run',
              },
              {
                library_frame: true,
                exclude_from_grouping: false,
                filename: 'TaskThread.java',
                classname:
                  'org.apache.tomcat.util.threads.TaskThread$WrappingRunnable',
                line: {
                  number: 61,
                },
                module: 'org.apache.tomcat.util.threads',
                function: 'run',
              },
            ],
            message:
              'No converter found for return value of type: class com.sun.proxy.$Proxy158',
            type: 'org.springframework.http.converter.HttpMessageNotWritableException',
          },
        ],
        id: '128f8ecf47bc8a800269ee6e5ac90008',
        grouping_key: 'cc9272d7511c88a533ac41cc3e2ce54b',
        grouping_name:
          'No converter found for return value of type: class com.sun.proxy.$Proxy158',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      ecs: {
        version: '1.11.0',
      },
      host: {
        os: {
          platform: 'Linux',
        },
        ip: '10.12.0.15',
        architecture: 'amd64',
      },
      client: {
        ip: '10.12.0.22',
      },
      event: {
        ingested: '2021-10-19T13:57:10.382394342Z',
      },
      user_agent: {
        original: 'http.rb/5.0.2',
        name: 'Other',
        device: {
          name: 'Generic Feature Phone',
          type: 'Other',
        },
      },
      timestamp: {
        us: 1634651822536408,
      },
      process: {
        pid: 7,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      message:
        'No converter found for return value of type: class com.sun.proxy.$Proxy158',
      processor: {
        name: 'error',
        event: 'error',
      },
      url: {
        path: '/api/products/3',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans',
        full: 'http://opbeans:3000/api/products/3',
      },
      '@timestamp': '2021-10-19T13:57:02.546Z',
      service: {
        node: {
          name: '59036ecb70908dfec4e03edc477f6875d08677871b4af0db3144373802d00cb1',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.11',
        },
        language: {
          name: 'Java',
          version: '11.0.11',
        },
        version: '2021-10-14 17:49:52',
      },
      http: {
        request: {
          headers: {
            'User-Agent': ['http.rb/5.0.2'],
            'X-Forwarded-For': ['10.12.0.22, 10.12.0.14'],
            Host: ['opbeans:3000'],
            'Accept-Encoding': ['gzip'],
            'Elastic-Apm-Traceparent': [
              '00-d5e80ae688f1fef91533f02dd2bdc769-35e3637e26919055-01',
            ],
            Tracestate: ['es=s:1.0'],
            Traceparent: [
              '00-d5e80ae688f1fef91533f02dd2bdc769-35e3637e26919055-01',
            ],
          },
          method: 'GET',
        },
        response: {
          status_code: 500,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      transaction: {
        id: '2c30263c4ad8fe8b',
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: 'e7b69f99cb7523bedea6d7c97b684cf4b7ff458d0cba1efb1ac843300b3bf3c7',
      },
      kubernetes: {
        pod: {
          uid: 'c5169b50-f3b3-4693-8e4b-150fca17c333',
          name: 'opbeans-go-5d795ddf6b-rhlvf',
        },
      },
      parent: {
        id: '9f50f43e924d0b46',
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      process: {
        args: [
          '/opbeans-go',
          '-log-level=debug',
          '-log-json',
          '-listen=:3000',
          '-frontend=/opbeans-frontend',
          '-db=postgres:',
          '-cache=redis://redis-master:6379',
        ],
        pid: 1,
        title: 'opbeans-go',
        ppid: 0,
      },
      error: {
        culprit: 'logrusMiddleware',
        log: {
          stacktrace: [
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'hook.go',
              abs_path:
                '/go/pkg/mod/go.elastic.co/apm/module/apmlogrus@v1.14.0/hook.go',
              line: {
                number: 102,
              },
              module: 'go.elastic.co/apm/module/apmlogrus',
              function: '(*Hook).Fire',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'hooks.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/hooks.go',
              line: {
                number: 28,
              },
              module: 'github.com/sirupsen/logrus',
              function: 'LevelHooks.Fire',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              filename: 'entry.go',
              line: {
                number: 272,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).fireHooks',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 241,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).log',
            },
            {
              exclude_from_grouping: false,
              library_frame: true,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 293,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).Log',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 338,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).Logf',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 367,
              },
              function: '(*Entry).Errorf',
              module: 'github.com/sirupsen/logrus',
            },
            {
              exclude_from_grouping: false,
              filename: 'logger.go',
              abs_path: '/src/opbeans-go/logger.go',
              line: {
                number: 56,
              },
              module: 'main',
              function: 'logrusMiddleware',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              filename: 'context.go',
              line: {
                number: 165,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Context).Next',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              abs_path:
                '/go/pkg/mod/go.elastic.co/apm/module/apmgin@v1.14.0/middleware.go',
              filename: 'middleware.go',
              line: {
                number: 98,
              },
              module: 'go.elastic.co/apm/module/apmgin',
              function: '(*middleware).handle',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'context.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              line: {
                number: 165,
              },
              function: '(*Context).Next',
              module: 'github.com/gin-gonic/gin',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'cache.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-contrib/cache@v1.1.0/cache.go',
              line: {
                number: 128,
              },
              module: 'github.com/gin-contrib/cache',
              function: 'Cache.func1',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'context.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              line: {
                number: 165,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Context).Next',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'gin.go',
              abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
              line: {
                number: 489,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Engine).handleHTTPRequest',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
              filename: 'gin.go',
              line: {
                number: 445,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Engine).ServeHTTP',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'server.go',
              abs_path: '/usr/local/go/src/net/http/server.go',
              line: {
                number: 2878,
              },
              module: 'net/http',
              function: 'serverHandler.ServeHTTP',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'server.go',
              abs_path: '/usr/local/go/src/net/http/server.go',
              line: {
                number: 1929,
              },
              module: 'net/http',
              function: '(*conn).serve',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'asm_amd64.s',
              abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
              line: {
                number: 1581,
              },
              module: 'runtime',
              function: 'goexit',
            },
          ],
          level: 'error',
          message: 'GET /api/products/3 (500)',
        },
        id: '1660f82c1340f415e9a31b47565300ee',
        grouping_key: '7a640436a9be648fd708703d1ac84650',
        grouping_name: 'GET /api/products/3 (500)',
      },
      message: 'GET /api/products/3 (500)',
      processor: {
        name: 'error',
        event: 'error',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-lmf6c',
        id: '7eedab18-1171-4a1b-a590-975e13fd103a',
        ephemeral_id: '90034868-48e6-418c-8ab4-6616b403bca7',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.539Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        node: {
          name: 'e7b69f99cb7523bedea6d7c97b684cf4b7ff458d0cba1efb1ac843300b3bf3c7',
        },
        environment: 'testing',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.17.2',
        },
        language: {
          name: 'go',
          version: 'go1.17.2',
        },
        version: '2021-10-14 17:49:50',
      },
      host: {
        os: {
          platform: 'linux',
        },
        ip: '10.12.0.14',
        architecture: 'amd64',
      },
      event: {
        ingested: '2021-10-19T13:57:05.412811279Z',
      },
      transaction: {
        id: '9f50f43e924d0b46',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
    {
      container: {
        id: '015d1127421e2c3d42a0fb031fc75e989813f58973143b6c7e33dca6ccc6f31b',
      },
      kubernetes: {
        pod: {
          uid: '459a6abf-198e-4107-b4dd-b0ae826755ab',
          name: 'opbeans-go-nsn-69b89c4598-xsvgh',
        },
      },
      parent: {
        id: 'b7801be83bcdc972',
      },
      process: {
        args: [
          '/opbeans-go',
          '-log-level=debug',
          '-log-json',
          '-listen=:3000',
          '-frontend=/opbeans-frontend',
          '-db=postgres:',
          '-cache=redis://redis-master:6379',
        ],
        pid: 1,
        title: 'opbeans-go',
        ppid: 0,
      },
      agent: {
        name: 'go',
        version: '1.14.0',
      },
      message: 'GET /api/products/3 (500)',
      error: {
        culprit: 'logrusMiddleware',
        log: {
          stacktrace: [
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'hook.go',
              abs_path:
                '/go/pkg/mod/go.elastic.co/apm/module/apmlogrus@v1.14.0/hook.go',
              line: {
                number: 102,
              },
              module: 'go.elastic.co/apm/module/apmlogrus',
              function: '(*Hook).Fire',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'hooks.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/hooks.go',
              line: {
                number: 28,
              },
              function: 'LevelHooks.Fire',
              module: 'github.com/sirupsen/logrus',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 272,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).fireHooks',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 241,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).log',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 293,
              },
              function: '(*Entry).Log',
              module: 'github.com/sirupsen/logrus',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 338,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).Logf',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'entry.go',
              abs_path:
                '/go/pkg/mod/github.com/sirupsen/logrus@v1.8.1/entry.go',
              line: {
                number: 367,
              },
              module: 'github.com/sirupsen/logrus',
              function: '(*Entry).Errorf',
            },
            {
              exclude_from_grouping: false,
              filename: 'logger.go',
              abs_path: '/src/opbeans-go/logger.go',
              line: {
                number: 56,
              },
              module: 'main',
              function: 'logrusMiddleware',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'context.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              line: {
                number: 165,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Context).Next',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'middleware.go',
              abs_path:
                '/go/pkg/mod/go.elastic.co/apm/module/apmgin@v1.14.0/middleware.go',
              line: {
                number: 98,
              },
              module: 'go.elastic.co/apm/module/apmgin',
              function: '(*middleware).handle',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'context.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              line: {
                number: 165,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Context).Next',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'cache.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-contrib/cache@v1.1.0/cache.go',
              line: {
                number: 128,
              },
              module: 'github.com/gin-contrib/cache',
              function: 'Cache.func1',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'context.go',
              abs_path:
                '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/context.go',
              line: {
                number: 165,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Context).Next',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
              filename: 'gin.go',
              line: {
                number: 489,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Engine).handleHTTPRequest',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'gin.go',
              abs_path: '/go/pkg/mod/github.com/gin-gonic/gin@v1.7.4/gin.go',
              line: {
                number: 445,
              },
              module: 'github.com/gin-gonic/gin',
              function: '(*Engine).ServeHTTP',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'server.go',
              abs_path: '/usr/local/go/src/net/http/server.go',
              line: {
                number: 2878,
              },
              module: 'net/http',
              function: 'serverHandler.ServeHTTP',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'server.go',
              abs_path: '/usr/local/go/src/net/http/server.go',
              line: {
                number: 1929,
              },
              module: 'net/http',
              function: '(*conn).serve',
            },
            {
              library_frame: true,
              exclude_from_grouping: false,
              filename: 'asm_amd64.s',
              abs_path: '/usr/local/go/src/runtime/asm_amd64.s',
              line: {
                number: 1581,
              },
              function: 'goexit',
              module: 'runtime',
            },
          ],
          level: 'error',
          message: 'GET /api/products/3 (500)',
        },
        id: '7a265a869ad88851591e0e9734aa4a70',
        grouping_key: '7a640436a9be648fd708703d1ac84650',
        grouping_name: 'GET /api/products/3 (500)',
      },
      processor: {
        name: 'error',
        event: 'error',
      },
      cloud: {
        availability_zone: 'us-central1-c',
        instance: {
          name: 'gke-dev-oblt-dev-oblt-pool-18e89389-qntq',
          id: '5278603844673466232',
        },
        provider: 'gcp',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          name: 'elastic-observability',
          id: '8560181848',
        },
        region: 'us-central1',
      },
      observer: {
        hostname: 'apm-apm-server-65d9d8dd68-zvs6p',
        id: '69a7066f-46d2-42c4-a4cc-8400f60bf2b5',
        ephemeral_id: '0ab88569-c301-40e9-8e78-cac7c1dac2bc',
        type: 'apm-server',
        version: '7.16.0',
        version_major: 7,
      },
      trace: {
        id: 'd5e80ae688f1fef91533f02dd2bdc769',
      },
      '@timestamp': '2021-10-19T13:57:02.539Z',
      ecs: {
        version: '1.11.0',
      },
      service: {
        node: {
          name: '015d1127421e2c3d42a0fb031fc75e989813f58973143b6c7e33dca6ccc6f31b',
        },
        environment: 'testing',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.17.2',
        },
        language: {
          name: 'go',
          version: 'go1.17.2',
        },
        version: '2021-10-14 17:49:50',
      },
      host: {
        os: {
          platform: 'linux',
        },
        ip: '10.12.0.13',
        architecture: 'amd64',
      },
      event: {
        ingested: '2021-10-19T13:57:08.266888578Z',
      },
      transaction: {
        id: 'b7801be83bcdc972',
      },
      timestamp: {
        us: 1634651822536408,
      },
    },
  ],
} as TraceAPIResponse;

export const traceWithErrors = {
  traceDocs: [
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 46,
        },
      },
      source: {
        ip: '172.19.0.13',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: '172.19.0.9',
        full: 'http://172.19.0.9:3000/api/orders',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      http: {
        request: {
          headers: {
            Accept: ['*/*'],
            'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
            Host: ['172.19.0.9:3000'],
            'Accept-Encoding': ['gzip, deflate'],
          },
          method: 'get',
          socket: {
            encrypted: false,
            remote_address: '172.19.0.13',
          },
          body: {
            original: '[REDACTED]',
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': ['chunked'],
            Date: ['Mon, 23 Mar 2020 15:04:28 GMT'],
            'Content-Type': ['application/json;charset=ISO-8859-1'],
          },
          status_code: 200,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      client: {
        ip: '172.19.0.13',
      },
      transaction: {
        duration: {
          us: 18842,
        },
        result: 'HTTP 2xx',
        name: 'DispatcherServlet#doGet',
        id: '49809ad3c26adf74',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      user_agent: {
        original: 'Python/3.7 aiohttp/3.3.2',
        name: 'Other',
        device: {
          name: 'Other',
        },
      },
      timestamp: {
        us: 1584975868785000,
      },
    },
    {
      parent: {
        id: 'fc107f7b556eb49b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        framework: {
          name: 'gin',
          version: 'v1.4.0',
        },
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        duration: {
          us: 16597,
        },
        result: 'HTTP 2xx',
        name: 'GET /api/orders',
        id: '975c8d5bfd1dd20b',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      timestamp: {
        us: 1584975868787052,
      },
    },
    {
      parent: {
        id: 'daae24d83c269918',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      timestamp: {
        us: 1584975868788603,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      '@timestamp': '2020-03-23T15:04:28.788Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        result: 'HTTP 2xx',
        duration: {
          us: 14648,
        },
        name: 'GET opbeans.views.orders',
        span_count: {
          dropped: 0,
          started: 1,
        },
        id: '6fb0ff7365b87298',
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      parent: {
        id: '49809ad3c26adf74',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 44,
        },
      },
      destination: {
        address: 'opbeans-go',
        port: 3000,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        type: 'apm-server',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      connection: {
        hash: "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
      },
      transaction: {
        id: '49809ad3c26adf74',
      },
      timestamp: {
        us: 1584975868785273,
      },
      span: {
        duration: {
          us: 17530,
        },
        subtype: 'http',
        name: 'GET opbeans-go',
        destination: {
          service: {
            resource: 'opbeans-go:3000',
            name: 'http://opbeans-go:3000',
            type: 'external',
          },
        },
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-go:3000/api/orders',
          },
        },
        id: 'fc107f7b556eb49b',
        type: 'external',
      },
    },
    {
      parent: {
        id: '975c8d5bfd1dd20b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        id: '975c8d5bfd1dd20b',
      },
      timestamp: {
        us: 1584975868787174,
      },
      span: {
        duration: {
          us: 16250,
        },
        subtype: 'http',
        destination: {
          service: {
            resource: 'opbeans-python:3000',
            name: 'http://opbeans-python:3000',
            type: 'external',
          },
        },
        name: 'GET opbeans-python:3000',
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-python:3000/api/orders',
          },
        },
        id: 'daae24d83c269918',
        type: 'external',
      },
    },
    {
      container: {
        id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
      },
      parent: {
        id: '6fb0ff7365b87298',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.790Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        id: '6fb0ff7365b87298',
      },
      timestamp: {
        us: 1584975868790080,
      },
      span: {
        duration: {
          us: 2519,
        },
        subtype: 'postgresql',
        name: 'SELECT "n"."id", "n"."address", "n"."city", "n"."company_name", "n"."country", "n"."email", "n"."full_name", "n"."postal_code" FROM "customers" AS "n" WHERE "n"."id" = @__id_0 LIMIT 1',
        destination: {
          service: {
            resource: 'postgresql',
            name: 'postgresql',
            type: 'db',
          },
        },
        action: 'query',
        id: 'c9407abb4d08ead1',
        type: 'db',
        sync: true,
        db: {
          statement:
            'SELECT "n"."id", "n"."address", "n"."city", "n"."company_name", "n"."country", "n"."email", "n"."full_name", "n"."postal_code" FROM "customers" AS "n" WHERE "n"."id" = @__id_0 LIMIT 1',
          type: 'sql',
        },
      },
    },
  ],
  exceedsMax: false,
  errorDocs: [
    {
      parent: {
        id: '975c8d5bfd1dd20b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      error: {
        culprit: 'logrusMiddleware',
        log: {
          level: 'error',
          message: 'GET //api/products (502)',
        },
        id: '1f3cb98206b5c54225cb7c8908a658da',
        grouping_key: '4dba2ff58fe6c036a5dee2ce411e512a',
      },
      processor: {
        name: 'error',
        event: 'error',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T16:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        id: '975c8d5bfd1dd20b',
        sampled: false,
      },
      timestamp: {
        us: 1584975868787052,
      },
    },
    {
      parent: {
        id: '6fb0ff7365b87298',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      error: {
        culprit: 'logrusMiddleware',
        log: {
          level: 'error',
          message: 'GET //api/products (502)',
        },
        id: '1f3cb98206b5c54225cb7c8908a658d2',
        grouping_key: '4dba2ff58fe6c036a5dee2ce411e512a',
      },
      processor: {
        name: 'error',
        event: 'error',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T16:04:28.790Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        name: 'opbeans-python',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        id: '6fb0ff7365b87298',
        sampled: false,
      },
      timestamp: {
        us: 1584975868790000,
      },
    },
  ],
} as unknown as TraceAPIResponse;

export const traceChildStartBeforeParent = {
  traceDocs: [
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 46,
        },
      },
      source: {
        ip: '172.19.0.13',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: '172.19.0.9',
        full: 'http://172.19.0.9:3000/api/orders',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      http: {
        request: {
          headers: {
            Accept: ['*/*'],
            'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
            Host: ['172.19.0.9:3000'],
            'Accept-Encoding': ['gzip, deflate'],
          },
          method: 'get',
          socket: {
            encrypted: false,
            remote_address: '172.19.0.13',
          },
          body: {
            original: '[REDACTED]',
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': ['chunked'],
            Date: ['Mon, 23 Mar 2020 15:04:28 GMT'],
            'Content-Type': ['application/json;charset=ISO-8859-1'],
          },
          status_code: 200,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      client: {
        ip: '172.19.0.13',
      },
      transaction: {
        duration: {
          us: 18842,
        },
        result: 'HTTP 2xx',
        name: 'DispatcherServlet#doGet',
        id: '49809ad3c26adf74',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      user_agent: {
        original: 'Python/3.7 aiohttp/3.3.2',
        name: 'Other',
        device: {
          name: 'Other',
        },
      },
      timestamp: {
        us: 1584975868785000,
      },
    },
    {
      parent: {
        id: 'fc107f7b556eb49b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        framework: {
          name: 'gin',
          version: 'v1.4.0',
        },
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        duration: {
          us: 16597,
        },
        result: 'HTTP 2xx',
        name: 'GET /api/orders',
        id: '975c8d5bfd1dd20b',
        span_count: {
          dropped: 0,
          started: 1,
        },
        type: 'request',
        sampled: true,
      },
      timestamp: {
        us: 1584975868787052,
      },
    },
    {
      parent: {
        id: 'daae24d83c269918',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      timestamp: {
        us: 1584975868780000,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/orders',
        scheme: 'http',
        port: 3000,
        domain: 'opbeans-go',
        full: 'http://opbeans-go:3000/api/orders',
      },
      '@timestamp': '2020-03-23T15:04:28.788Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        result: 'HTTP 2xx',
        duration: {
          us: 1464,
        },
        name: 'I started before my parent 😰',
        span_count: {
          dropped: 0,
          started: 1,
        },
        id: '6fb0ff7365b87298',
        type: 'request',
        sampled: true,
      },
    },
    {
      container: {
        id: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
      },
      parent: {
        id: '49809ad3c26adf74',
      },
      process: {
        pid: 6,
        title: '/usr/lib/jvm/java-10-openjdk-amd64/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '99ce8403-5875-4945-b074-d37dc10563eb',
        version: '1.14.1-SNAPSHOT',
      },
      internal: {
        sampler: {
          value: 44,
        },
      },
      destination: {
        address: 'opbeans-go',
        port: 3000,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: 'f37f48d8b60b',
        id: 'd8522e1f-be8e-43c2-b290-ac6b6c0f171e',
        type: 'apm-server',
        ephemeral_id: '6ed88f14-170e-478d-a4f5-ea5e7f4b16b9',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.785Z',
      ecs: {
        version: '1.4.0',
      },
      service: {
        node: {
          name: '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '10.0.2',
        },
        language: {
          name: 'Java',
          version: '10.0.2',
        },
        version: 'None',
      },
      host: {
        hostname: '4cf84d094553',
        os: {
          platform: 'Linux',
        },
        ip: '172.19.0.9',
        name: '4cf84d094553',
        architecture: 'amd64',
      },
      connection: {
        hash: "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
      },
      transaction: {
        id: '49809ad3c26adf74',
      },
      timestamp: {
        us: 1584975868785273,
      },
      span: {
        duration: {
          us: 17530,
        },
        subtype: 'http',
        name: 'GET opbeans-go',
        destination: {
          service: {
            resource: 'opbeans-go:3000',
            name: 'http://opbeans-go:3000',
            type: 'external',
          },
        },
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-go:3000/api/orders',
          },
        },
        id: 'fc107f7b556eb49b',
        type: 'external',
      },
    },
    {
      parent: {
        id: '975c8d5bfd1dd20b',
      },
      agent: {
        name: 'go',
        version: '1.7.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.787Z',
      service: {
        node: {
          name: 'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
        },
        environment: 'production',
        name: 'opbeans-go',
        runtime: {
          name: 'gc',
          version: 'go1.14.1',
        },
        language: {
          name: 'go',
          version: 'go1.14.1',
        },
        version: 'None',
      },
      transaction: {
        id: '975c8d5bfd1dd20b',
      },
      timestamp: {
        us: 1584975868787174,
      },
      span: {
        duration: {
          us: 16250,
        },
        subtype: 'http',
        destination: {
          service: {
            resource: 'opbeans-python:3000',
            name: 'http://opbeans-python:3000',
            type: 'external',
          },
        },
        name: 'I am his 👇🏻 parent 😡',
        http: {
          response: {
            status_code: 200,
          },
          url: {
            original: 'http://opbeans-python:3000/api/orders',
          },
        },
        id: 'daae24d83c269918',
        type: 'external',
      },
    },
    {
      container: {
        id: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
      },
      parent: {
        id: '6fb0ff7365b87298',
      },
      agent: {
        name: 'python',
        version: '5.5.2',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      trace: {
        id: '513d33fafe99bbe6134749310c9b5322',
      },
      '@timestamp': '2020-03-23T15:04:28.790Z',
      service: {
        node: {
          name: 'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
        },
        environment: 'production',
        framework: {
          name: 'django',
          version: '2.1.13',
        },
        name: 'opbeans-python',
        runtime: {
          name: 'CPython',
          version: '3.6.10',
        },
        language: {
          name: 'python',
          version: '3.6.10',
        },
        version: 'None',
      },
      transaction: {
        id: '6fb0ff7365b87298',
      },
      timestamp: {
        us: 1584975868781000,
      },
      span: {
        duration: {
          us: 2519,
        },
        subtype: 'postgresql',
        name: 'I am using my parents skew 😇',
        destination: {
          service: {
            resource: 'postgresql',
            name: 'postgresql',
            type: 'db',
          },
        },
        action: 'query',
        id: 'c9407abb4d08ead1',
        type: 'db',
        sync: true,
        db: {
          statement:
            'SELECT "opbeans_order"."id", "opbeans_order"."customer_id", "opbeans_customer"."full_name", "opbeans_order"."created_at" FROM "opbeans_order" INNER JOIN "opbeans_customer" ON ("opbeans_order"."customer_id" = "opbeans_customer"."id")  LIMIT 1000',
          type: 'sql',
        },
      },
    },
  ],
  exceedsMax: false,
  errorDocs: [],
} as TraceAPIResponse;

export const inferredSpans = {
  traceDocs: [
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      source: {
        ip: '172.18.0.8',
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      url: {
        path: '/api/products/2',
        scheme: 'http',
        port: 3000,
        domain: '172.18.0.7',
        full: 'http://172.18.0.7:3000/api/products/2',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.786Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      client: {
        ip: '172.18.0.8',
      },
      http: {
        request: {
          headers: {
            Accept: ['*/*'],
            'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
            Host: ['172.18.0.7:3000'],
            'Accept-Encoding': ['gzip, deflate'],
          },
          method: 'get',
          socket: {
            encrypted: false,
            remote_address: '172.18.0.8',
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': ['chunked'],
            Date: ['Thu, 09 Apr 2020 11:36:01 GMT'],
            'Content-Type': ['application/json;charset=UTF-8'],
          },
          status_code: 200,
          finished: true,
          headers_sent: true,
        },
        version: '1.1',
      },
      user_agent: {
        original: 'Python/3.7 aiohttp/3.3.2',
        name: 'Other',
        device: {
          name: 'Other',
        },
      },
      transaction: {
        duration: {
          us: 237537,
        },
        result: 'HTTP 2xx',
        name: 'APIRestController#product',
        span_count: {
          dropped: 0,
          started: 3,
        },
        id: 'f2387d37260d00bd',
        type: 'request',
        sampled: true,
      },
      timestamp: {
        us: 1586432160786001,
      },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: 'f2387d37260d00bd',
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.810Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      span: {
        duration: {
          us: 204574,
        },
        subtype: 'inferred',
        name: 'ServletInvocableHandlerMethod#invokeAndHandle',
        id: 'a5df600bd7bd5e38',
        type: 'app',
      },
      timestamp: {
        us: 1586432160810441,
      },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: 'a5df600bd7bd5e38',
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        type: 'apm-server',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.810Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      timestamp: {
        us: 1586432160810441,
      },
      span: {
        duration: {
          us: 102993,
        },
        stacktrace: [
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'InvocableHandlerMethod.java',
            line: {
              number: -1,
            },
            function: 'doInvoke',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'InvocableHandlerMethod.java',
            line: {
              number: -1,
            },
            function: 'invokeForRequest',
          },
        ],
        subtype: 'inferred',
        name: 'APIRestController#product',
        id: '808dc34fc41ce522',
        type: 'app',
      },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: 'f2387d37260d00bd',
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      labels: {
        productId: '2',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.832Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      timestamp: {
        us: 1586432160832300,
      },
      span: {
        duration: {
          us: 99295,
        },
        name: 'OpenTracing product span',
        id: '41226ae63af4f235',
        type: 'unknown',
      },
      child: { id: ['8d80de06aa11a6fc'] },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: '808dc34fc41ce522',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.859Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      timestamp: {
        us: 1586432160859600,
      },
      span: {
        duration: {
          us: 53835,
        },
        subtype: 'inferred',
        name: 'Loader#executeQueryStatement',
        id: '8d80de06aa11a6fc',
        type: 'app',
      },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: '41226ae63af4f235',
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      destination: {
        address: 'postgres',
        port: 5432,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.903Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      timestamp: {
        us: 1586432160903236,
      },
      span: {
        duration: {
          us: 10211,
        },
        subtype: 'postgresql',
        destination: {
          service: {
            resource: 'postgresql',
            name: 'postgresql',
            type: 'db',
          },
        },
        name: 'SELECT FROM products',
        action: 'query',
        id: '3708d5623658182f',
        type: 'db',
        db: {
          statement:
            'select product0_.id as col_0_0_, product0_.sku as col_1_0_, product0_.name as col_2_0_, product0_.description as col_3_0_, product0_.cost as col_4_0_, product0_.selling_price as col_5_0_, product0_.stock as col_6_0_, producttyp1_.id as col_7_0_, producttyp1_.name as col_8_0_, (select sum(orderline2_.amount) from order_lines orderline2_ where orderline2_.product_id=product0_.id) as col_9_0_ from products product0_ left outer join product_types producttyp1_ on product0_.type_id=producttyp1_.id where product0_.id=?',
          type: 'sql',
          user: {
            name: 'postgres',
          },
        },
      },
    },
    {
      container: {
        id: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
      },
      parent: {
        id: '41226ae63af4f235',
      },
      process: {
        pid: 6,
        title: '/opt/java/openjdk/bin/java',
        ppid: 1,
      },
      agent: {
        name: 'java',
        ephemeral_id: '1cb5c830-c677-4b13-b340-ab1502f527c3',
        version: '1.15.1-SNAPSHOT',
      },
      destination: {
        address: 'postgres',
        port: 5432,
      },
      processor: {
        name: 'transaction',
        event: 'span',
      },
      observer: {
        hostname: '7189f754b5a3',
        id: 'f32d8d9f-a9f9-4355-8370-548dfd8024dc',
        ephemeral_id: 'bff20764-0195-4f78-aa84-d799fc47b954',
        type: 'apm-server',
        version: '8.0.0',
        version_major: 8,
      },
      trace: {
        id: '3b0dc77f3754e5bcb9da0e4c15e0db97',
      },
      '@timestamp': '2020-04-09T11:36:00.859Z',
      ecs: {
        version: '1.5.0',
      },
      service: {
        node: {
          name: 'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
        },
        environment: 'production',
        name: 'opbeans-java',
        runtime: {
          name: 'Java',
          version: '11.0.6',
        },
        language: {
          name: 'Java',
          version: '11.0.6',
        },
        version: 'None',
      },
      host: {
        hostname: 'fc2ae281f56f',
        os: {
          platform: 'Linux',
        },
        ip: '172.18.0.7',
        name: 'fc2ae281f56f',
        architecture: 'amd64',
      },
      transaction: {
        id: 'f2387d37260d00bd',
      },
      timestamp: {
        us: 1586432160859508,
      },
      span: {
        duration: {
          us: 4503,
        },
        subtype: 'postgresql',
        destination: {
          service: {
            resource: 'postgresql',
            name: 'postgresql',
            type: 'db',
          },
        },
        name: 'empty query',
        action: 'query',
        id: '9871cfd612368932',
        type: 'db',
        db: {
          rows_affected: 0,
          statement: '(empty query)',
          type: 'sql',
          user: {
            name: 'postgres',
          },
        },
      },
    },
  ],
  exceedsMax: false,
  errorDocs: [],
} as TraceAPIResponse;
