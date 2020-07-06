/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';

export const location = {
  pathname: '/services/opbeans-go/transactions/view',
  search:
    '?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0&kuery=service.name%253A%2520%2522opbeans-java%2522%2520or%2520service.name%2520%253A%2520%2522opbeans-go%2522&traceId=513d33fafe99bbe6134749310c9b5322&transactionId=975c8d5bfd1dd20b&transactionName=GET%20%2Fapi%2Forders&transactionType=request',
  hash: '',
} as Location;

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
  kuery: 'service.name: "opbeans-java" or service.name : "opbeans-go"',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  processorEvent: 'transaction',
  serviceName: 'opbeans-go',
} as IUrlParams;

export const simpleTrace = {
  trace: {
    items: [
      {
        container: {
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
          hash:
            "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
          id:
            'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
  },
  errorsPerTransaction: {},
};

export const traceWithErrors = {
  trace: {
    items: [
      {
        container: {
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
          hash:
            "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
          id:
            'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
  },
  errorsPerTransaction: {
    '975c8d5bfd1dd20b': 1,
    '6fb0ff7365b87298': 1,
  },
};

export const traceChildStartBeforeParent = {
  trace: {
    items: [
      {
        container: {
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
          id:
            '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
            name:
              '4cf84d094553201997ddb7fea344b7c6ef18dcb8233eba39278946ee8449794e',
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
          hash:
            "{service.environment:'production'}/{service.name:'opbeans-java'}/{span.subtype:'http'}/{destination.address:'opbeans-go'}/{span.type:'external'}",
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
            name:
              'e948a08b8f5efe99b5da01f50da48c7d8aee3bbf4701f3da85ebe760c2ffef29',
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
          id:
            'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
            name:
              'a636915f1f6eec81ab44342b13a3ea9597ef03a24391e4e55f34ae2e20b30f51',
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
  },
  errorsPerTransaction: {},
};

export const inferredSpans = {
  trace: {
    items: [
      {
        container: {
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
          id:
            'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
            name:
              'fc2ae281f56fb84728bc9b5e6c17f3d13bbb7f4efd461158558e5c38e655abad',
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
  },
  errorsPerTransaction: {},
};
