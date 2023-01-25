/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataStream } from '../runtime_types';
import { formatSyntheticsPolicy } from './format_synthetics_policy';

describe('formatSyntheticsPolicy', () => {
  it('formats browser policy', () => {
    const { formattedPolicy } = formatSyntheticsPolicy(
      testNewPolicy,
      DataStream.BROWSER,
      browserConfig
    );

    expect(formattedPolicy).toEqual({
      enabled: true,
      inputs: [
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'http',
                type: 'synthetics',
              },
              enabled: false,
              vars: {
                __ui: {
                  type: 'yaml',
                },
                'check.request.body': {
                  type: 'yaml',
                },
                'check.request.headers': {
                  type: 'yaml',
                },
                'check.request.method': {
                  type: 'text',
                },
                'check.response.body.negative': {
                  type: 'yaml',
                },
                'check.response.body.positive': {
                  type: 'yaml',
                },
                'check.response.headers': {
                  type: 'yaml',
                },
                'check.response.status': {
                  type: 'yaml',
                },
                config_id: {
                  type: 'text',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                id: {
                  type: 'text',
                },
                location_name: {
                  type: 'text',
                  value: 'Fleet managed',
                },
                max_redirects: {
                  type: 'integer',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                },
                origin: {
                  type: 'text',
                },
                password: {
                  type: 'password',
                },
                proxy_url: {
                  type: 'text',
                },
                'response.include_body': {
                  type: 'text',
                },
                'response.include_headers': {
                  type: 'bool',
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                },
                'ssl.certificate': {
                  type: 'yaml',
                },
                'ssl.certificate_authorities': {
                  type: 'yaml',
                },
                'ssl.key': {
                  type: 'yaml',
                },
                'ssl.key_passphrase': {
                  type: 'text',
                },
                'ssl.supported_protocols': {
                  type: 'yaml',
                },
                'ssl.verification_mode': {
                  type: 'text',
                },
                tags: {
                  type: 'yaml',
                },
                timeout: {
                  type: 'text',
                },
                type: {
                  type: 'text',
                  value: 'http',
                },
                urls: {
                  type: 'text',
                },
                username: {
                  type: 'text',
                },
              },
            },
          ],
          type: 'synthetics/http',
        },
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'tcp',
                type: 'synthetics',
              },
              enabled: false,
              vars: {
                __ui: {
                  type: 'yaml',
                },
                'check.receive': {
                  type: 'text',
                },
                'check.send': {
                  type: 'text',
                },
                config_id: {
                  type: 'text',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                hosts: {
                  type: 'text',
                },
                id: {
                  type: 'text',
                },
                location_name: {
                  type: 'text',
                  value: 'Fleet managed',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                },
                origin: {
                  type: 'text',
                },
                proxy_url: {
                  type: 'text',
                },
                proxy_use_local_resolver: {
                  type: 'bool',
                  value: false,
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                },
                'ssl.certificate': {
                  type: 'yaml',
                },
                'ssl.certificate_authorities': {
                  type: 'yaml',
                },
                'ssl.key': {
                  type: 'yaml',
                },
                'ssl.key_passphrase': {
                  type: 'text',
                },
                'ssl.supported_protocols': {
                  type: 'yaml',
                },
                'ssl.verification_mode': {
                  type: 'text',
                },
                tags: {
                  type: 'yaml',
                },
                timeout: {
                  type: 'text',
                },
                type: {
                  type: 'text',
                  value: 'tcp',
                },
              },
            },
          ],
          type: 'synthetics/tcp',
        },
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'icmp',
                type: 'synthetics',
              },
              enabled: false,
              vars: {
                __ui: {
                  type: 'yaml',
                },
                config_id: {
                  type: 'text',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                hosts: {
                  type: 'text',
                },
                id: {
                  type: 'text',
                },
                location_name: {
                  type: 'text',
                  value: 'Fleet managed',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                },
                origin: {
                  type: 'text',
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                },
                tags: {
                  type: 'yaml',
                },
                timeout: {
                  type: 'text',
                },
                type: {
                  type: 'text',
                  value: 'icmp',
                },
                wait: {
                  type: 'text',
                  value: '1s',
                },
              },
            },
          ],
          type: 'synthetics/icmp',
        },
        {
          enabled: true,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'browser',
                type: 'synthetics',
              },
              enabled: true,
              vars: {
                __ui: {
                  type: 'yaml',
                  value:
                    '{"script_source":{"is_generated_script":false,"file_name":""},"is_zip_url_tls_enabled":false,"is_tls_enabled":false}',
                },
                config_id: {
                  type: 'text',
                  value: '00bb3ceb-a242-4c7a-8405-8da963661374',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                'filter_journeys.match': {
                  type: 'text',
                  value: null,
                },
                'filter_journeys.tags': {
                  type: 'yaml',
                  value: null,
                },
                id: {
                  type: 'text',
                  value: '00bb3ceb-a242-4c7a-8405-8da963661374',
                },
                ignore_https_errors: {
                  type: 'bool',
                  value: false,
                },
                location_name: {
                  type: 'text',
                  value: 'Test private location 0',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                  value: 'Test HTTP Monitor 03',
                },
                origin: {
                  type: 'text',
                  value: 'ui',
                },
                params: {
                  type: 'yaml',
                  value: '',
                },
                playwright_options: {
                  type: 'yaml',
                  value: '',
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                screenshots: {
                  type: 'text',
                  value: 'on',
                },
                'service.name': {
                  type: 'text',
                  value: '',
                },
                'source.inline.script': {
                  type: 'yaml',
                  value:
                    '"step(\\"Visit /users api route\\", async () => {\\\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\\\n  expect(response.status()).toEqual(200);\\\\n});"',
                },
                'source.project.content': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.folder': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.password': {
                  type: 'password',
                  value: '',
                },
                'source.zip_url.proxy_url': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.ssl.certificate': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.certificate_authorities': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.key': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.key_passphrase': {
                  type: 'text',
                },
                'source.zip_url.ssl.supported_protocols': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.verification_mode': {
                  type: 'text',
                },
                'source.zip_url.url': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.username': {
                  type: 'text',
                  value: '',
                },
                synthetics_args: {
                  type: 'text',
                  value: null,
                },
                tags: {
                  type: 'yaml',
                  value: '["cookie-test","browser"]',
                },
                'throttling.config': {
                  type: 'text',
                  value: '5d/3u/20l',
                },
                timeout: {
                  type: 'text',
                  value: '16s',
                },
                type: {
                  type: 'text',
                  value: 'browser',
                },
              },
            },
            {
              data_stream: {
                dataset: 'browser.network',
                type: 'synthetics',
              },
              enabled: true,
            },
            {
              data_stream: {
                dataset: 'browser.screenshot',
                type: 'synthetics',
              },
              enabled: true,
            },
          ],
          type: 'synthetics/browser',
        },
      ],
      is_managed: true,
      name: 'Test HTTP Monitor 03-Test private location 0-default',
      namespace: 'testnamespace',
      package: {
        experimental_data_stream_features: [],
        name: 'synthetics',
        title: 'Elastic Synthetics',
        version: '0.11.4',
      },
      policy_id: '404812e0-90e1-11ed-8111-f7f9cad30b61',
    });
  });

  it('formats http policy', () => {
    const { formattedPolicy } = formatSyntheticsPolicy(testNewPolicy, DataStream.HTTP, httpPolicy);

    expect(formattedPolicy).toEqual({
      enabled: true,
      inputs: [
        {
          enabled: true,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'http',
                type: 'synthetics',
              },
              enabled: true,
              vars: {
                __ui: {
                  type: 'yaml',
                  value: '{"is_tls_enabled":false,"is_zip_url_tls_enabled":false}',
                },
                'check.request.body': {
                  type: 'yaml',
                  value: null,
                },
                'check.request.headers': {
                  type: 'yaml',
                  value: null,
                },
                'check.request.method': {
                  type: 'text',
                  value: 'GET',
                },
                'check.response.body.negative': {
                  type: 'yaml',
                  value: null,
                },
                'check.response.body.positive': {
                  type: 'yaml',
                  value: null,
                },
                'check.response.headers': {
                  type: 'yaml',
                  value: null,
                },
                'check.response.status': {
                  type: 'yaml',
                  value: null,
                },
                config_id: {
                  type: 'text',
                  value: '51ccd9d9-fc3f-4718-ba9d-b6ef80e73fc5',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                id: {
                  type: 'text',
                  value: '51ccd9d9-fc3f-4718-ba9d-b6ef80e73fc5',
                },
                location_name: {
                  type: 'text',
                  value: 'Test private location 0',
                },
                max_redirects: {
                  type: 'integer',
                  value: '0',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                  value: 'Test Monitor',
                },
                origin: {
                  type: 'text',
                  value: 'ui',
                },
                password: {
                  type: 'password',
                  value: 'changeme',
                },
                proxy_url: {
                  type: 'text',
                  value: '',
                },
                'response.include_body': {
                  type: 'text',
                  value: 'on_error',
                },
                'response.include_headers': {
                  type: 'bool',
                  value: true,
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                  value: 'LocalService',
                },
                'ssl.certificate': {
                  type: 'yaml',
                  value: null,
                },
                'ssl.certificate_authorities': {
                  type: 'yaml',
                  value: null,
                },
                'ssl.key': {
                  type: 'yaml',
                  value: null,
                },
                'ssl.key_passphrase': {
                  type: 'text',
                  value: null,
                },
                'ssl.supported_protocols': {
                  type: 'yaml',
                  value: '["TLSv1.1","TLSv1.2","TLSv1.3"]',
                },
                'ssl.verification_mode': {
                  type: 'text',
                  value: 'full',
                },
                tags: {
                  type: 'yaml',
                  value: null,
                },
                timeout: {
                  type: 'text',
                  value: '16s',
                },
                type: {
                  type: 'text',
                  value: 'http',
                },
                urls: {
                  type: 'text',
                  value: 'https://www.google.com',
                },
                username: {
                  type: 'text',
                  value: '',
                },
              },
            },
          ],
          type: 'synthetics/http',
        },
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'tcp',
                type: 'synthetics',
              },
              enabled: false,
              vars: {
                __ui: {
                  type: 'yaml',
                },
                'check.receive': {
                  type: 'text',
                },
                'check.send': {
                  type: 'text',
                },
                config_id: {
                  type: 'text',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                hosts: {
                  type: 'text',
                },
                id: {
                  type: 'text',
                },
                location_name: {
                  type: 'text',
                  value: 'Fleet managed',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                },
                origin: {
                  type: 'text',
                },
                proxy_url: {
                  type: 'text',
                },
                proxy_use_local_resolver: {
                  type: 'bool',
                  value: false,
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                },
                'ssl.certificate': {
                  type: 'yaml',
                },
                'ssl.certificate_authorities': {
                  type: 'yaml',
                },
                'ssl.key': {
                  type: 'yaml',
                },
                'ssl.key_passphrase': {
                  type: 'text',
                },
                'ssl.supported_protocols': {
                  type: 'yaml',
                },
                'ssl.verification_mode': {
                  type: 'text',
                },
                tags: {
                  type: 'yaml',
                },
                timeout: {
                  type: 'text',
                },
                type: {
                  type: 'text',
                  value: 'tcp',
                },
              },
            },
          ],
          type: 'synthetics/tcp',
        },
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'icmp',
                type: 'synthetics',
              },
              enabled: false,
              vars: {
                __ui: {
                  type: 'yaml',
                },
                config_id: {
                  type: 'text',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                hosts: {
                  type: 'text',
                },
                id: {
                  type: 'text',
                },
                location_name: {
                  type: 'text',
                  value: 'Fleet managed',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                },
                origin: {
                  type: 'text',
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                'service.name': {
                  type: 'text',
                },
                tags: {
                  type: 'yaml',
                },
                timeout: {
                  type: 'text',
                },
                type: {
                  type: 'text',
                  value: 'icmp',
                },
                wait: {
                  type: 'text',
                  value: '1s',
                },
              },
            },
          ],
          type: 'synthetics/icmp',
        },
        {
          enabled: false,
          policy_template: 'synthetics',
          streams: [
            {
              data_stream: {
                dataset: 'browser',
                type: 'synthetics',
              },
              enabled: true,
              vars: {
                __ui: {
                  type: 'yaml',
                  value:
                    '{"script_source":{"is_generated_script":false,"file_name":""},"is_zip_url_tls_enabled":false,"is_tls_enabled":false}',
                },
                config_id: {
                  type: 'text',
                  value: '00bb3ceb-a242-4c7a-8405-8da963661374',
                },
                enabled: {
                  type: 'bool',
                  value: true,
                },
                'filter_journeys.match': {
                  type: 'text',
                  value: null,
                },
                'filter_journeys.tags': {
                  type: 'yaml',
                  value: null,
                },
                id: {
                  type: 'text',
                  value: '00bb3ceb-a242-4c7a-8405-8da963661374',
                },
                ignore_https_errors: {
                  type: 'bool',
                  value: false,
                },
                location_name: {
                  type: 'text',
                  value: 'Test private location 0',
                },
                'monitor.project.id': {
                  type: 'text',
                },
                'monitor.project.name': {
                  type: 'text',
                },
                name: {
                  type: 'text',
                  value: 'Test HTTP Monitor 03',
                },
                origin: {
                  type: 'text',
                  value: 'ui',
                },
                params: {
                  type: 'yaml',
                  value: '',
                },
                playwright_options: {
                  type: 'yaml',
                  value: '',
                },
                run_once: {
                  type: 'bool',
                  value: false,
                },
                schedule: {
                  type: 'text',
                  value: '"@every 3m"',
                },
                screenshots: {
                  type: 'text',
                  value: 'on',
                },
                'service.name': {
                  type: 'text',
                  value: '',
                },
                'source.inline.script': {
                  type: 'yaml',
                  value:
                    '"step(\\"Visit /users api route\\", async () => {\\\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\\\n  expect(response.status()).toEqual(200);\\\\n});"',
                },
                'source.project.content': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.folder': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.password': {
                  type: 'password',
                  value: '',
                },
                'source.zip_url.proxy_url': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.ssl.certificate': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.certificate_authorities': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.key': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.key_passphrase': {
                  type: 'text',
                },
                'source.zip_url.ssl.supported_protocols': {
                  type: 'yaml',
                },
                'source.zip_url.ssl.verification_mode': {
                  type: 'text',
                },
                'source.zip_url.url': {
                  type: 'text',
                  value: '',
                },
                'source.zip_url.username': {
                  type: 'text',
                  value: '',
                },
                synthetics_args: {
                  type: 'text',
                  value: null,
                },
                tags: {
                  type: 'yaml',
                  value: '["cookie-test","browser"]',
                },
                'throttling.config': {
                  type: 'text',
                  value: '5d/3u/20l',
                },
                timeout: {
                  type: 'text',
                  value: '16s',
                },
                type: {
                  type: 'text',
                  value: 'browser',
                },
              },
            },
            {
              data_stream: {
                dataset: 'browser.network',
                type: 'synthetics',
              },
              enabled: true,
            },
            {
              data_stream: {
                dataset: 'browser.screenshot',
                type: 'synthetics',
              },
              enabled: true,
            },
          ],
          type: 'synthetics/browser',
        },
      ],
      is_managed: true,
      name: 'Test HTTP Monitor 03-Test private location 0-default',
      namespace: 'testnamespace',
      package: {
        experimental_data_stream_features: [],
        name: 'synthetics',
        title: 'Elastic Synthetics',
        version: '0.11.4',
      },
      policy_id: '404812e0-90e1-11ed-8111-f7f9cad30b61',
    });
  });
});

const testNewPolicy = {
  name: 'Test HTTP Monitor 03-Test private location 0-default',
  namespace: 'testnamespace',
  package: {
    name: 'synthetics',
    title: 'Elastic Synthetics',
    version: '0.11.4',
    experimental_data_stream_features: [],
  },
  enabled: true,
  policy_id: '404812e0-90e1-11ed-8111-f7f9cad30b61',
  inputs: [
    {
      type: 'synthetics/http',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: { type: 'synthetics', dataset: 'http' },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'http', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            urls: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            max_redirects: { type: 'integer' },
            proxy_url: { type: 'text' },
            tags: { type: 'yaml' },
            username: { type: 'text' },
            password: { type: 'password' },
            'response.include_headers': { type: 'bool' },
            'response.include_body': { type: 'text' },
            'check.request.method': { type: 'text' },
            'check.request.headers': { type: 'yaml' },
            'check.request.body': { type: 'yaml' },
            'check.response.status': { type: 'yaml' },
            'check.response.headers': { type: 'yaml' },
            'check.response.body.positive': { type: 'yaml' },
            'check.response.body.negative': { type: 'yaml' },
            'ssl.certificate_authorities': { type: 'yaml' },
            'ssl.certificate': { type: 'yaml' },
            'ssl.key': { type: 'yaml' },
            'ssl.key_passphrase': { type: 'text' },
            'ssl.verification_mode': { type: 'text' },
            'ssl.supported_protocols': { type: 'yaml' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
        },
      ],
    },
    {
      type: 'synthetics/tcp',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: { type: 'synthetics', dataset: 'tcp' },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'tcp', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            hosts: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            proxy_url: { type: 'text' },
            proxy_use_local_resolver: { value: false, type: 'bool' },
            tags: { type: 'yaml' },
            'check.send': { type: 'text' },
            'check.receive': { type: 'text' },
            'ssl.certificate_authorities': { type: 'yaml' },
            'ssl.certificate': { type: 'yaml' },
            'ssl.key': { type: 'yaml' },
            'ssl.key_passphrase': { type: 'text' },
            'ssl.verification_mode': { type: 'text' },
            'ssl.supported_protocols': { type: 'yaml' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
        },
      ],
    },
    {
      type: 'synthetics/icmp',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: { type: 'synthetics', dataset: 'icmp' },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'icmp', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            wait: { value: '1s', type: 'text' },
            hosts: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            tags: { type: 'yaml' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
        },
      ],
    },
    {
      type: 'synthetics/browser',
      policy_template: 'synthetics',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser' },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'browser', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            tags: { type: 'yaml' },
            'source.zip_url.url': { type: 'text' },
            'source.zip_url.username': { type: 'text' },
            'source.zip_url.folder': { type: 'text' },
            'source.zip_url.password': { type: 'password' },
            'source.inline.script': { type: 'yaml' },
            'source.project.content': { type: 'text' },
            params: { type: 'yaml' },
            playwright_options: { type: 'yaml' },
            screenshots: { type: 'text' },
            synthetics_args: { type: 'text' },
            ignore_https_errors: { type: 'bool' },
            'throttling.config': { type: 'text' },
            'filter_journeys.tags': { type: 'yaml' },
            'filter_journeys.match': { type: 'text' },
            'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
            'source.zip_url.ssl.certificate': { type: 'yaml' },
            'source.zip_url.ssl.key': { type: 'yaml' },
            'source.zip_url.ssl.key_passphrase': { type: 'text' },
            'source.zip_url.ssl.verification_mode': { type: 'text' },
            'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
            'source.zip_url.proxy_url': { type: 'text' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
        },
        { enabled: true, data_stream: { type: 'synthetics', dataset: 'browser.network' } },
        { enabled: true, data_stream: { type: 'synthetics', dataset: 'browser.screenshot' } },
      ],
    },
  ],
  is_managed: true,
};

const browserConfig: any = {
  type: 'browser',
  form_monitor_type: 'multistep',
  enabled: true,
  alert: { status: { enabled: true } },
  schedule: { number: '3', unit: 'm' },
  'service.name': '',
  config_id: '00bb3ceb-a242-4c7a-8405-8da963661374',
  tags: ['cookie-test', 'browser'],
  timeout: '16',
  name: 'Test HTTP Monitor 03',
  locations: [
    {
      id: '404812e0-90e1-11ed-8111-f7f9cad30b61',
      label: 'Test private location 0',
      isServiceManaged: false,
    },
  ],
  namespace: 'testnamespace',
  origin: 'ui',
  journey_id: '',
  hash: '',
  id: '00bb3ceb-a242-4c7a-8405-8da963661374',
  project_id: '',
  playwright_options: '',
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_zip_url_tls_enabled: false,
    is_tls_enabled: false,
  },
  params: '',
  'url.port': null,
  'source.inline.script':
    'step("Visit /users api route", async () => {\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\n  expect(response.status()).toEqual(200);\\n});',
  'source.project.content': '',
  'source.zip_url.url': '',
  'source.zip_url.username': '',
  'source.zip_url.password': '',
  'source.zip_url.folder': '',
  'source.zip_url.proxy_url': '',
  playwright_text_assertion: '',
  urls: '',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  'throttling.is_enabled': true,
  'throttling.download_speed': '5',
  'throttling.upload_speed': '3',
  'throttling.latency': '20',
  'throttling.config': '5d/3u/20l',
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.key': '',
  'ssl.key_passphrase': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
  revision: 1,
  fields: { config_id: '00bb3ceb-a242-4c7a-8405-8da963661374' },
  fields_under_root: true,
  location_name: 'Test private location 0',
};

const httpPolicy: any = {
  type: 'http',
  form_monitor_type: 'http',
  enabled: true,
  alert: { status: { enabled: true } },
  schedule: { number: '3', unit: 'm' },
  'service.name': 'LocalService',
  config_id: '51ccd9d9-fc3f-4718-ba9d-b6ef80e73fc5',
  tags: [],
  timeout: '16',
  name: 'Test Monitor',
  locations: [
    {
      id: '404812e0-90e1-11ed-8111-f7f9cad30b61',
      label: 'Test private location 0',
      geo: { lat: '', lon: '' },
      isServiceManaged: false,
    },
  ],
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  hash: '',
  id: '51ccd9d9-fc3f-4718-ba9d-b6ef80e73fc5',
  __ui: { is_tls_enabled: false, is_zip_url_tls_enabled: false },
  urls: 'https://www.google.com',
  max_redirects: '0',
  'url.port': null,
  password: 'changeme',
  proxy_url: '',
  'check.response.body.negative': [],
  'check.response.body.positive': [],
  'response.include_body': 'on_error',
  'check.response.headers': {},
  'response.include_headers': true,
  'check.response.status': [],
  'check.request.body': { type: 'text', value: '' },
  'check.request.headers': {},
  'check.request.method': 'GET',
  username: '',
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.key': '',
  'ssl.key_passphrase': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
  fields: { config_id: '51ccd9d9-fc3f-4718-ba9d-b6ef80e73fc5' },
  fields_under_root: true,
  params: '',
  location_name: 'Test private location 0',
};
