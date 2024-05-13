/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';
import { defaultStatusInstalled } from './cspm_status_handlers';
import { defaultBenchmarks } from './benchmark_handlers';
import { defaultRulesGetStates } from './rules_handlers';
import { defaultApiLicensingInfo } from './api/licensing_handler';
import { defaultDataViewFindHandler } from './data_views/find';

export const defaultHandlers = [
  defaultStatusInstalled,
  defaultBenchmarks,
  defaultRulesGetStates,
  defaultApiLicensingInfo,
  defaultDataViewFindHandler,
  http.get('http://localhost/api/licensing/info', () => {
    return HttpResponse.json(
      {
        isAvailable: true,
        isActive: true,
        type: 'basic',
        mode: 'basic',
        expiryDateInMillis: null,
        status: 'active',
        uid: 'basic',
        signature: 'basic',
        features: {
          cloud: {
            isAvailable: true,
            isEnabled: true,
            isExpired: false,
            type: 'trial',
            expiryDateInMillis: 1620320400000,
          },
          security: {
            isAvailable: true,
            isEnabled: true,
            isExpired: false,
            type: 'trial',
            expiryDateInMillis: 1620320400000,
          },
        },
      },
      { status: 200 }
    );
  }),
  http.get('http://localhost/api/fleet/epm/packages/cloud_security_posture', () => {
    return HttpResponse.json(
      {
        item: {
          name: 'cloud_security_posture',
          title: 'Security Posture Management',
          version: '1.9.0-preview04',
          release: 'beta',
          source: {
            license: 'Elastic-2.0',
          },
          description: 'Identify & remediate configuration risks in your Cloud infrastructure',
          type: 'integration',
          download: '/epr/cloud_security_posture/cloud_security_posture-1.9.0-preview04.zip',
          path: '/package/cloud_security_posture/1.9.0-preview04',
          icons: [
            {
              src: '/img/logo_cloud_security_posture.svg',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_cloud_security_posture.svg',
              title: 'Cloud Security Posture logo',
              size: '32x32',
              type: 'image/svg+xml',
            },
          ],
          conditions: {
            kibana: {
              version: '^8.14.0',
            },
            elastic: {
              subscription: 'basic',
              capabilities: ['security'],
            },
          },
          owner: {
            type: 'elastic',
            github: 'elastic/cloud-security-posture',
          },
          categories: ['security', 'cloudsecurity_cdr'],
          signature_path:
            '/epr/cloud_security_posture/cloud_security_posture-1.9.0-preview04.zip.sig',
          format_version: '3.0.0',
          readme: '/package/cloud_security_posture/1.9.0-preview04/docs/README.md',
          license: 'basic',
          screenshots: [
            {
              src: '/img/dashboard.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/dashboard.png',
              title: 'Dashboard page',
              size: '1293x718',
              type: 'image/png',
            },
            {
              src: '/img/findings.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/findings.png',
              title: 'Findings page',
              size: '3134x1740',
              type: 'image/png',
            },
            {
              src: '/img/findings-flyout.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/findings-flyout.png',
              title: 'Detailed view of a single finding',
              size: '3176x1748',
              type: 'image/png',
            },
            {
              src: '/img/benchmarks.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/benchmarks.png',
              title: 'Benchmarks page',
              size: '3168x1752',
              type: 'image/png',
            },
            {
              src: '/img/rules.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/rules.png',
              title: 'Rules page',
              size: '3160x1708',
              type: 'image/png',
            },
          ],
          assets: {
            kibana: {
              csp_rule_template: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '01629238-aea8-5737-a59b-45baf8dab404.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/01629238-aea8-5737-a59b-45baf8dab404.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/02ca1a3a-559e-53d7-afcd-8e3774c4efb9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '02da047f-bc78-5565-86a0-e121850f76c0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/02da047f-bc78-5565-86a0-e121850f76c0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/04e01d1a-d7d4-5020-a398-8aadd3fe32ae.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05480064-f899-53e8-b8ad-34172b09b400.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05480064-f899-53e8-b8ad-34172b09b400.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05676b4e-3274-5984-9981-6aa1623c24ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05676b4e-3274-5984-9981-6aa1623c24ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05c4bd94-162d-53e8-b112-e617ce74f8f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05c4bd94-162d-53e8-b112-e617ce74f8f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05f0c324-5c11-576f-b7a2-35ebf66f084b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05f0c324-5c11-576f-b7a2-35ebf66f084b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '06161f41-c17a-586f-b08e-c45ea5157da0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/06161f41-c17a-586f-b08e-c45ea5157da0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '06635c87-1e11-59c3-9eba-b4d8a08ba899.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/06635c87-1e11-59c3-9eba-b4d8a08ba899.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/067385c5-d3a0-536a-bd4f-ed7c1f4033ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '08d850ca-c1be-57e2-ac39-5e38f8750cf6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/08d850ca-c1be-57e2-ac39-5e38f8750cf6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '090923c7-e599-572b-bad3-703f768c262a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/090923c7-e599-572b-bad3-703f768c262a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0bdfe13d-7bc8-5415-8517-65114d344798.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0bdfe13d-7bc8-5415-8517-65114d344798.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0d5ddd5f-749b-516b-89ca-b5bf18ba4861.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0e318770-7077-5996-afd8-27ca34fc5446.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0e318770-7077-5996-afd8-27ca34fc5446.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1054ef6c-8f47-5d20-a922-8df0ac93acfa.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1054ef6c-8f47-5d20-a922-8df0ac93acfa.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '129b07b7-4470-5224-8246-6ae975d6304b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/129b07b7-4470-5224-8246-6ae975d6304b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1316108c-33a8-5198-9529-45716c5a87b1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1316108c-33a8-5198-9529-45716c5a87b1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '151312c8-7e97-5420-ac05-5a916b3c1feb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/151312c8-7e97-5420-ac05-5a916b3c1feb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/15c6f217-2ae2-5bb4-8ebe-f40adf02910d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1706a986-39d7-5900-93eb-f191f6a40892.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1706a986-39d7-5900-93eb-f191f6a40892.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '17282e92-075f-593d-99eb-99346e4288ed.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/17282e92-075f-593d-99eb-99346e4288ed.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1915b785-942d-5613-9a24-b40394ef745f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1915b785-942d-5613-9a24-b40394ef745f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1a8ee966-458a-5ff9-a6e9-436aba157ebd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1a8ee966-458a-5ff9-a6e9-436aba157ebd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1b112bf6-61ad-5b08-888b-7b6c86b3526c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1b112bf6-61ad-5b08-888b-7b6c86b3526c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1b89acc6-978c-57c3-b319-680e5251d6f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1b89acc6-978c-57c3-b319-680e5251d6f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1d0a20ee-ad20-5416-84c8-32c0f69b209b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1d0a20ee-ad20-5416-84c8-32c0f69b209b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1d6ff20d-4803-574b-80d2-e47031d9baa2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1d6ff20d-4803-574b-80d2-e47031d9baa2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1e180f0d-3419-5681-838b-9247927eb0f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1e180f0d-3419-5681-838b-9247927eb0f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1e4f8b50-90e4-5e99-8a40-a21b142eb6b4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1ea2df8f-a973-561b-a1f9-a0bea9cfba36.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1f9c62f6-5c4a-59e6-9a12-0260b7e04a37.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '213e2b33-f2b1-575b-8753-f239b278c25a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/213e2b33-f2b1-575b-8753-f239b278c25a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '23941040-0aae-5afd-bc8d-793742133647.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/23941040-0aae-5afd-bc8d-793742133647.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '23e5f81e-ca05-53bf-8109-7e676feecee3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/23e5f81e-ca05-53bf-8109-7e676feecee3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/266ccbf1-813d-529b-b7a6-3d225d3dc1a9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '26ff6dff-042f-5901-8191-0e347d113e9e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/26ff6dff-042f-5901-8191-0e347d113e9e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '27896f4b-0405-5388-bacd-182e77556711.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/27896f4b-0405-5388-bacd-182e77556711.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '27acd88e-c64f-5e9e-9cff-2de649f92ccf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/27acd88e-c64f-5e9e-9cff-2de649f92ccf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '28f96eda-c94e-597c-aef0-0bceee085540.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/28f96eda-c94e-597c-aef0-0bceee085540.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '29cefccd-77fe-5428-8bea-3fc1390d5d1e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/29cefccd-77fe-5428-8bea-3fc1390d5d1e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2d0044e3-d235-5703-9c16-729932a0131e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2d0044e3-d235-5703-9c16-729932a0131e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2f7d9d2a-ec1f-545a-8258-ea62bbffad7f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '328a73c3-011d-5827-ae86-4e323739e4e1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/328a73c3-011d-5827-ae86-4e323739e4e1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '33299b3d-68da-5604-8c62-62690fd40c49.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/33299b3d-68da-5604-8c62-62690fd40c49.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '33a612ed-8dee-554d-9dd7-857bfc31a33a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/33a612ed-8dee-554d-9dd7-857bfc31a33a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34a4790c-0214-5eec-b97d-1c11ffa6861e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34a4790c-0214-5eec-b97d-1c11ffa6861e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34b16c08-cf25-5f0d-afed-98f75b5513de.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34b16c08-cf25-5f0d-afed-98f75b5513de.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34c9c662-5072-5195-835e-48da9be5047f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34c9c662-5072-5195-835e-48da9be5047f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '368b52f8-b468-5fc7-9e47-b1b5e040e051.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/368b52f8-b468-5fc7-9e47-b1b5e040e051.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '374309b1-b87a-58bd-b795-1067d2e8ee9f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/374309b1-b87a-58bd-b795-1067d2e8ee9f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3760ac17-de0b-537d-8e74-455d132d19d2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3760ac17-de0b-537d-8e74-455d132d19d2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '37fc1edc-a59d-5e63-a530-d3d088195865.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/37fc1edc-a59d-5e63-a530-d3d088195865.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3851b212-b300-545d-8d6b-54ef71c86661.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3851b212-b300-545d-8d6b-54ef71c86661.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '38535c6f-a478-5cbb-82de-9417a3968bd6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/38535c6f-a478-5cbb-82de-9417a3968bd6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '394963fa-63fd-5e81-82eb-ea1b8dfacd53.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/394963fa-63fd-5e81-82eb-ea1b8dfacd53.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3afddcd1-b745-5b3c-8623-ce4abe6878b5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3afddcd1-b745-5b3c-8623-ce4abe6878b5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3bfcca47-de6a-57d4-961f-3c7f5b5f699c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3cd971cb-cf64-51ef-875b-9a7787cd97cb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3cd971cb-cf64-51ef-875b-9a7787cd97cb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3d701761-f9b6-5c2d-ab99-928161d2ebbd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3d701761-f9b6-5c2d-ab99-928161d2ebbd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3ed0b9d8-c5f2-55e2-92a5-2531868e79ca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3ef4430e-2829-576a-a813-edc766625ea9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3ef4430e-2829-576a-a813-edc766625ea9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3fb6051e-31f8-5fb5-bd45-4f140fa4442e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '40ab36e3-7438-5c36-afcd-bf5f5401366e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/40ab36e3-7438-5c36-afcd-bf5f5401366e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '421191d6-a13c-5c78-8c5b-102e1229655f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/421191d6-a13c-5c78-8c5b-102e1229655f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/429ada1f-ad8f-5c2d-97fd-31485ace8a0c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '43d5538c-17a3-5e04-9c06-ad4323bfd188.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/43d5538c-17a3-5e04-9c06-ad4323bfd188.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '449bf7bf-8070-580f-a3aa-66bc7f94a721.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/449bf7bf-8070-580f-a3aa-66bc7f94a721.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '461c5ca2-0173-5b8c-ae36-b229cffefbb2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/461c5ca2-0173-5b8c-ae36-b229cffefbb2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '47ee9344-791e-50e4-a266-ee2ebce093a7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/47ee9344-791e-50e4-a266-ee2ebce093a7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4931d684-a386-5545-b2c4-47b836e0149b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4931d684-a386-5545-b2c4-47b836e0149b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '49c71814-2dbe-5204-ad07-879a80503fbc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/49c71814-2dbe-5204-ad07-879a80503fbc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '49fe9df5-e86f-5981-ac24-dcaadadc2790.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/49fe9df5-e86f-5981-ac24-dcaadadc2790.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4a130791-cdb3-5524-b45d-1f3df79e2452.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4a130791-cdb3-5524-b45d-1f3df79e2452.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4a6a8b7a-d7a2-5a52-af5c-70009500bbc5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4b11956d-7985-524e-900e-20405e2baaca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4b11956d-7985-524e-900e-20405e2baaca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4b1f12b8-5fe6-5cc6-b404-58df727bcd45.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4cfe4df4-4157-53bb-820f-278fe02ec960.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4cfe4df4-4157-53bb-820f-278fe02ec960.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4d0a1c5a-27b5-5429-895d-e90878fcce1d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4d0a1c5a-27b5-5429-895d-e90878fcce1d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4da6e870-fed1-5822-bb2d-f6a1714bc4a8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4eb0d962-c123-575e-8c0c-9d10a2fbe5d1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/506b205e-9b6a-5d6e-b136-3e5d7101b1bc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '50da62ee-4099-5950-ba1e-984794749f28.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/50da62ee-4099-5950-ba1e-984794749f28.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5133d843-d913-5c1c-930f-89560b828704.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5133d843-d913-5c1c-930f-89560b828704.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5382994d-59e0-54d9-a32b-dd860c467813.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5382994d-59e0-54d9-a32b-dd860c467813.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5411a1e9-a529-5512-b556-93178e544c9e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5411a1e9-a529-5512-b556-93178e544c9e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '551d3a0b-36f6-51c6-ba8b-0a83926b1864.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/551d3a0b-36f6-51c6-ba8b-0a83926b1864.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '551e7bcf-b231-500d-a193-d0a98163a680.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/551e7bcf-b231-500d-a193-d0a98163a680.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '555cf8d5-f963-5574-a856-e06614cf9341.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/555cf8d5-f963-5574-a856-e06614cf9341.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5cdc703f-54ea-5de6-97c4-9fdb495725ef.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5cdc703f-54ea-5de6-97c4-9fdb495725ef.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5d7e7fce-64fb-5b7b-beeb-920496c2e333.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5d7e7fce-64fb-5b7b-beeb-920496c2e333.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5dd8b281-9a80-50a7-a03d-fe462a5a2ba0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ee4897d-808b-5ad6-877b-a276f8e65076.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ee4897d-808b-5ad6-877b-a276f8e65076.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ee69b99-8f70-5daf-b784-866131aca3ba.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ee69b99-8f70-5daf-b784-866131aca3ba.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '61ab077c-fc0f-5920-8bcf-ccc037a4139b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/61ab077c-fc0f-5920-8bcf-ccc037a4139b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '62b717ac-bb8f-5274-a99f-5806dc4427a5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/62b717ac-bb8f-5274-a99f-5806dc4427a5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '64d37675-473f-5edc-882e-5b8b85b789c3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/64d37675-473f-5edc-882e-5b8b85b789c3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '64feecfc-7166-5d77-b830-bf4a8dd2e05d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/64feecfc-7166-5d77-b830-bf4a8dd2e05d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6588bb48-d02b-5169-a013-fe4dc115c709.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6588bb48-d02b-5169-a013-fe4dc115c709.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '668cee84-c115-5166-a422-05c4d3e88c2c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/668cee84-c115-5166-a422-05c4d3e88c2c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '66cd0518-cfa3-5917-a399-a7dfde4e19db.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/66cd0518-cfa3-5917-a399-a7dfde4e19db.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '66cdd4cc-5870-50e1-959c-91443716b87a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/66cdd4cc-5870-50e1-959c-91443716b87a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/677bdabb-ee3f-58a6-82f6-d40ccc4efe13.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '67909c46-649c-52c1-a464-b3e81615d938.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/67909c46-649c-52c1-a464-b3e81615d938.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '68cfd04b-fc79-5877-8638-af3aa82d92db.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/68cfd04b-fc79-5877-8638-af3aa82d92db.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '68f9d23f-882f-55d1-86c6-711413c31129.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/68f9d23f-882f-55d1-86c6-711413c31129.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '69ffe7f6-bc09-5019-ba77-a2f81169e9de.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/69ffe7f6-bc09-5019-ba77-a2f81169e9de.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6b3b122f-ac19-5a57-b6d0-131daf3fbf6d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6d58f558-d07a-541c-b720-689459524679.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6d58f558-d07a-541c-b720-689459524679.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6de73498-23d7-537f-83f3-08c660217e7e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6de73498-23d7-537f-83f3-08c660217e7e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e339632-0d1c-5a7c-8ca3-fac5813932d9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e339632-0d1c-5a7c-8ca3-fac5813932d9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e46620d-cf63-55f9-b025-01889df276fd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e46620d-cf63-55f9-b025-01889df276fd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e6481f1-5ede-552b-84e5-cceed281052a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e6481f1-5ede-552b-84e5-cceed281052a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '70f92ed3-5659-5c95-a8f8-a63211c57635.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/70f92ed3-5659-5c95-a8f8-a63211c57635.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '71cd1aed-48f7-5490-a63d-e22436549822.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/71cd1aed-48f7-5490-a63d-e22436549822.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '72bb12e0-31c0-54f4-a409-4aace3b602be.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/72bb12e0-31c0-54f4-a409-4aace3b602be.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '737dc646-1c66-5fb6-8fcd-1aac6402532d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/737dc646-1c66-5fb6-8fcd-1aac6402532d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '741aa940-22a7-5015-95d5-f94b331d774e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/741aa940-22a7-5015-95d5-f94b331d774e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '756e1a54-b2ce-56b9-a13f-17f652d7767c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/756e1a54-b2ce-56b9-a13f-17f652d7767c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '76be4dd2-a77a-5981-a893-db6770b35911.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/76be4dd2-a77a-5981-a893-db6770b35911.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/76fea8f6-7bf2-5dc4-85f0-1aec20fbf100.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '77d274cb-69ae-5a85-b8f6-ba192aee8af4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/77d274cb-69ae-5a85-b8f6-ba192aee8af4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7a2ab526-3440-5a0f-804c-c5eea8158053.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7a2ab526-3440-5a0f-804c-c5eea8158053.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7bb02abe-d669-5058-a2d6-6ce5ee2dc2be.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7c908585-ec93-52dc-81bb-ceb17cd4c313.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7c908585-ec93-52dc-81bb-ceb17cd4c313.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7d1de53a-a32e-55c0-b412-317ed91f65e0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7d1de53a-a32e-55c0-b412-317ed91f65e0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7e584486-4d0f-5edb-8a64-7ee0b59333b8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7e584486-4d0f-5edb-8a64-7ee0b59333b8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7eebf1d9-7a68-54fd-89b7-0f8b1441a179.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '80db9189-cd4d-572a-94dc-e635ee8af7fa.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/80db9189-cd4d-572a-94dc-e635ee8af7fa.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '81554879-3338-5208-9db3-efb2a549d38c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/81554879-3338-5208-9db3-efb2a549d38c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8233dcc7-c6af-5110-b7d4-239a70d7bed5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8233dcc7-c6af-5110-b7d4-239a70d7bed5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84862c2c-4aba-5458-9c5f-12855091617b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84862c2c-4aba-5458-9c5f-12855091617b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84b8b7be-d917-50f3-beab-c076d0098d83.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84b8b7be-d917-50f3-beab-c076d0098d83.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84c7925a-42ff-5999-b784-ab037f6242c6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84c7925a-42ff-5999-b784-ab037f6242c6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '873e6387-218d-587a-8fa1-3d65f4a77802.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/873e6387-218d-587a-8fa1-3d65f4a77802.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '875c1196-b6c7-5bc9-b255-e052853c3d08.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/875c1196-b6c7-5bc9-b255-e052853c3d08.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '87952b8d-f537-5f8a-b57b-63a31b031170.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/87952b8d-f537-5f8a-b57b-63a31b031170.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '882ffc80-73e9-56aa-ae72-73b39af6702f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/882ffc80-73e9-56aa-ae72-73b39af6702f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '88634421-e47c-59fb-9466-a86023f20dd5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/88634421-e47c-59fb-9466-a86023f20dd5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '88734e31-d055-58ba-bf70-7d40d0b4e707.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/88734e31-d055-58ba-bf70-7d40d0b4e707.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89a294ae-d736-51ca-99d4-0ea4782caed0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89a294ae-d736-51ca-99d4-0ea4782caed0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89b58088-54f6-55dc-96a3-f08ac4b27ea3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89b58088-54f6-55dc-96a3-f08ac4b27ea3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89cc8ff0-be81-55f2-b1cf-d7db1e214741.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89cc8ff0-be81-55f2-b1cf-d7db1e214741.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89ebec6b-3cc4-5898-a3b9-534174f93051.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89ebec6b-3cc4-5898-a3b9-534174f93051.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8a985fda-fc4c-5435-b7f0-c4d40bb1307a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8c36c21b-3c8f-5a92-bc7e-62871428f4d2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8d3f2919-da46-5502-b48b-9ba41d03281b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8d3f2919-da46-5502-b48b-9ba41d03281b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8f2644ed-70b5-576f-b9b9-aabea6821749.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8f2644ed-70b5-576f-b9b9-aabea6821749.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8f88e7f7-6924-5913-bc18-95fcdc5ae744.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8f88e7f7-6924-5913-bc18-95fcdc5ae744.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '900567f0-4c2f-543a-b5cf-d11223a772a2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/900567f0-4c2f-543a-b5cf-d11223a772a2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9126cd85-611c-5b06-b2f2-a18338e26ae1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9126cd85-611c-5b06-b2f2-a18338e26ae1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '919ef7a7-126c-517e-aa35-fb251b1ad587.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/919ef7a7-126c-517e-aa35-fb251b1ad587.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '91d52d43-da61-5ba2-a4d4-1018fee84559.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/91d52d43-da61-5ba2-a4d4-1018fee84559.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '92077c86-0322-5497-b94e-38ef356eadd6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/92077c86-0322-5497-b94e-38ef356eadd6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9209df46-e7e2-5d4b-b1b6-b54a196e7e5d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9259a915-0294-54d6-b379-162ceb36e875.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9259a915-0294-54d6-b379-162ceb36e875.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9272d2b5-4e25-5658-8a6c-d917f60134ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9272d2b5-4e25-5658-8a6c-d917f60134ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '92ab0102-d825-52ce-87a8-1d0b4e06166c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/92ab0102-d825-52ce-87a8-1d0b4e06166c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '933268ec-44e8-5fba-9ed7-535804521cc7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/933268ec-44e8-5fba-9ed7-535804521cc7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '934583bd-306a-51d9-a730-020bd45f7f01.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/934583bd-306a-51d9-a730-020bd45f7f01.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '93808f1f-f05e-5e48-b130-5527795e6158.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/93808f1f-f05e-5e48-b130-5527795e6158.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '94fb43f8-90da-5089-b503-66a04faa2630.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/94fb43f8-90da-5089-b503-66a04faa2630.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '94fbdc26-aa6f-52e6-9277-094174c46e29.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/94fbdc26-aa6f-52e6-9277-094174c46e29.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/95e368ec-eebe-5aa1-bc86-9fa532a82d3a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9718b528-8327-5eef-ad21-c8bed5532429.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9718b528-8327-5eef-ad21-c8bed5532429.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '97504079-0d62-5d0a-9939-17b57b444547.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/97504079-0d62-5d0a-9939-17b57b444547.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9a0d57ac-a54d-5652-bf07-982d542bf296.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9a0d57ac-a54d-5652-bf07-982d542bf296.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9a9d808f-61a9-55b7-a487-9d50fd2983c5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9a9d808f-61a9-55b7-a487-9d50fd2983c5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9c2d1c63-7bf3-584d-b87a-043853dad7a4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9c2d1c63-7bf3-584d-b87a-043853dad7a4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9ce2276b-db96-5aad-9329-08ce874c5db6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9ce2276b-db96-5aad-9329-08ce874c5db6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9ef34b4f-b9e1-566b-8a2b-69f8933fa852.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fb9a46f-de59-580b-938e-829090bd3975.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fb9a46f-de59-580b-938e-829090bd3975.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fc74adb-6ddd-5838-be72-cfd17fbfb74b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fcbc87c-0963-58ba-8e21-87e22b80fc27.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fcbc87c-0963-58ba-8e21-87e22b80fc27.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a1f327c0-3e4b-5b55-891a-b91e720cd535.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a1f327c0-3e4b-5b55-891a-b91e720cd535.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a22a5431-1471-534c-8e7c-1e16fe0a857c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a22a5431-1471-534c-8e7c-1e16fe0a857c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a2447c19-a799-5270-9e03-ac322c2396d5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a2447c19-a799-5270-9e03-ac322c2396d5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a3ffdc15-c93b-52a5-8e26-a27103b85bf3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a4b61e0e-b0ca-53c5-a744-4587c57e0f2d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a501efd2-73b9-5f92-a2c7-fa03ae753140.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a501efd2-73b9-5f92-a2c7-fa03ae753140.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a52c1d16-d925-545d-bbd9-4257c2485eea.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a52c1d16-d925-545d-bbd9-4257c2485eea.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a6074b1d-e115-5416-bdc5-6e1940effd09.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a6074b1d-e115-5416-bdc5-6e1940effd09.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a6a43181-3a24-5ead-b845-1f1b56c95ad5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a72cb3ec-36ae-56b0-815f-9f986f0d499f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a7c6b368-29db-53e6-8b86-dfaddf719f59.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a7c6b368-29db-53e6-8b86-dfaddf719f59.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a97eb244-d583-528c-a49a-17b0aa14decd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a97eb244-d583-528c-a49a-17b0aa14decd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a9f473e3-a8b4-5076-b59a-f0d1c5a961ba.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'aa4374f0-adab-580c-ac9d-907fd2783219.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/aa4374f0-adab-580c-ac9d-907fd2783219.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ab555e6d-b77e-5c85-b6a8-333f7e567b6b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'abc6f4b4-3add-57c4-973d-c678df60804c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/abc6f4b4-3add-57c4-973d-c678df60804c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ad4de26d-02a8-5202-b718-48147bf0fd03.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ad4de26d-02a8-5202-b718-48147bf0fd03.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/af0e7adc-2f70-5bf5-bce4-abf418bee40b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b0a70444-c719-5772-a8c1-2cd72578f8ee.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b0a70444-c719-5772-a8c1-2cd72578f8ee.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b0ed2847-4db1-57c3-b2b6-49b0576a2506.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b190337a-56a7-5906-8960-76fd05283599.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b190337a-56a7-5906-8960-76fd05283599.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b1b40df2-f562-564a-9d43-94774e1698d1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b1b40df2-f562-564a-9d43-94774e1698d1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b287617d-7623-5d72-923d-e79b1301e06c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b287617d-7623-5d72-923d-e79b1301e06c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b2909440-5ad0-522e-8db0-9439d573b7d5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b2909440-5ad0-522e-8db0-9439d573b7d5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b3b3c352-fc81-5874-8bbc-31e2f58e884e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b4133ca4-32f1-501e-ad0a-a22700208a4f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b4133ca4-32f1-501e-ad0a-a22700208a4f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b42eb917-8a4e-5cb7-93b1-886dbf2751bc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b449135c-8747-58fe-9d46-218728745520.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b449135c-8747-58fe-9d46-218728745520.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b5493b70-e25f-54e6-9931-36138c33f775.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b5493b70-e25f-54e6-9931-36138c33f775.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b56e76ca-b976-5b96-ab3f-359e5b51ddf2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b6189255-e8a5-5a01-87a6-a1b408a0d92a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b64386ab-20fa-57d2-9b5b-631d64181531.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b64386ab-20fa-57d2-9b5b-631d64181531.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b78aca72-f2c1-5cc2-b481-3f056f91bf4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b794635d-a338-5b4e-bfa0-75257e854c6a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b794635d-a338-5b4e-bfa0-75257e854c6a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b8c40039-034b-5299-8660-a7c8d34efe36.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b8c40039-034b-5299-8660-a7c8d34efe36.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b8f1182a-1b3e-5b08-8482-f74949163e97.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b8f1182a-1b3e-5b08-8482-f74949163e97.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b96194c6-8eb7-5835-852d-47b84db83697.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b96194c6-8eb7-5835-852d-47b84db83697.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ba545cc3-f447-5d14-8841-d3d3c05024e8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ba545cc3-f447-5d14-8841-d3d3c05024e8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bac65dd0-771b-5bfb-8e5f-3b1dc8962684.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bb264405-de3e-5b91-9654-2056f905fc67.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bb264405-de3e-5b91-9654-2056f905fc67.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bbc219e5-75d8-55d6-bccb-7d1acef796bf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bc5fb87e-7195-5318-9a2f-b8f6d487f961.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'be1197db-90d0-58db-b780-f0a939264bd0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/be1197db-90d0-58db-b780-f0a939264bd0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c0ef1e12-b201-5736-8475-4b62978084e8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c0ef1e12-b201-5736-8475-4b62978084e8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c13f49ab-845e-5a89-a05e-6a7c7b23f628.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c1581c69-3e5c-5ab2-bdde-3619955a1dcf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c1e1ca12-c0e2-543e-819d-22249927d241.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c1e1ca12-c0e2-543e-819d-22249927d241.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c28e606d-f6a7-58b2-820f-e2fb702bf956.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c28e606d-f6a7-58b2-820f-e2fb702bf956.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c2b36f84-34b5-57fd-b9b0-f225be981497.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c2b36f84-34b5-57fd-b9b0-f225be981497.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c2d65e60-221b-5748-a545-579a69ad4a93.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c2d65e60-221b-5748-a545-579a69ad4a93.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c40bebb5-5403-59d8-b960-00d6946931ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c40bebb5-5403-59d8-b960-00d6946931ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c43a57db-5248-5855-a613-2a05d0a42768.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c43a57db-5248-5855-a613-2a05d0a42768.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c444d9e3-d3de-5598-90e7-95a922b51664.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c444d9e3-d3de-5598-90e7-95a922b51664.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c455dba0-a768-5c76-8509-3484ec33102f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c455dba0-a768-5c76-8509-3484ec33102f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c52e86bd-55f1-5c6a-8349-918f97963346.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c52e86bd-55f1-5c6a-8349-918f97963346.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c53dab24-a23f-53c6-8d36-f64cc03ab277.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c53dab24-a23f-53c6-8d36-f64cc03ab277.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c67fb159-cec6-5114-bbfe-f9a1e57fdcd4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c8a8f827-fba6-58ee-80b8-e64a605a4902.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c8a8f827-fba6-58ee-80b8-e64a605a4902.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c8f24be5-fd7d-510f-ab93-2440bb826750.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c8f24be5-fd7d-510f-ab93-2440bb826750.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c9e64bdb-9225-5f60-b31c-a2d62f5427f9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cb57543f-5435-55b5-97cf-bda29ec9094a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cb57543f-5435-55b5-97cf-bda29ec9094a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cd05adf8-d0fe-54b6-b1a0-93cf02bcec72.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cda5f949-378c-5ef6-a65e-47187af983e4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cda5f949-378c-5ef6-a65e-47187af983e4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d117cea4-376b-5cb7-ad81-58a2f4efb47e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd1d73385-2909-598a-acf7-bf1d8130f314.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d1d73385-2909-598a-acf7-bf1d8130f314.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d1f8d730-5ee2-56bb-8065-78e8c8ae668c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd248e880-7d96-5559-a25c-0f56c289a2e7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d248e880-7d96-5559-a25c-0f56c289a2e7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd303c4f1-489c-56ca-add9-29820c2214af.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d303c4f1-489c-56ca-add9-29820c2214af.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd3d725bd-652f-573e-97f5-adfd002fab8e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d3d725bd-652f-573e-97f5-adfd002fab8e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d416ff74-0e84-56cc-a577-0cdeb6a220f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd498d11f-6c2a-5593-b6c6-6960b28da84e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d498d11f-6c2a-5593-b6c6-6960b28da84e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd57d6506-a519-5a29-a816-b1204ebfef21.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d57d6506-a519-5a29-a816-b1204ebfef21.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d63a2fd8-7ba2-5589-9899-23f99fd8c846.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d7011f2f-cd60-58cf-a184-eb2d5fb7339a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d98f24a9-e788-55d2-8b70-e9fe88311f9c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dafb527b-9869-5062-8d38-c9dced4a27c2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dafb527b-9869-5062-8d38-c9dced4a27c2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'db28165f-6f7c-5450-b9f3-61c7b897d833.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/db28165f-6f7c-5450-b9f3-61c7b897d833.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'db58a1e4-de58-5899-bee8-f6ced89d6f80.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/db58a1e4-de58-5899-bee8-f6ced89d6f80.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dbd6a799-b6c3-5768-ab68-9bd6f63bbd48.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dfc17731-aa8f-5ecc-878b-113d1db009ca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dfc17731-aa8f-5ecc-878b-113d1db009ca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dfc4b9b5-43dc-5ec2-97b4-76a71621fa40.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e06f9ef1-eedb-5f95-b8d4-36d27d602afd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e073f962-74d9-585b-ae5a-e37c461e9b7c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e073f962-74d9-585b-ae5a-e37c461e9b7c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e1b73c05-5137-5b65-9513-6f8018b6deff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e1b73c05-5137-5b65-9513-6f8018b6deff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e1c469c1-89d2-5cbd-a1f1-fe8f636b151f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e2306922-4f95-5660-bf2e-9610f556de69.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e2306922-4f95-5660-bf2e-9610f556de69.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e24bf247-bfdc-5bbf-9813-165b905b52e6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e24bf247-bfdc-5bbf-9813-165b905b52e6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e3c6b85b-703e-5891-a01f-640d59ec449e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e3c6b85b-703e-5891-a01f-640d59ec449e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e570dc22-4f5d-51db-a193-983cb7d20afe.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e570dc22-4f5d-51db-a193-983cb7d20afe.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e833e6a8-673d-56b2-a979-f9aa4e52cb71.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e83a8e8a-e34b-5a01-8142-82d5aef60cab.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e92ddce9-3cba-5e3d-adac-53df0350eca0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e92ddce9-3cba-5e3d-adac-53df0350eca0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ea3378aa-250e-50d8-9260-ff8237cf09a2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ea3378aa-250e-50d8-9260-ff8237cf09a2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eb9e71ae-113b-5631-9e5c-b7fdc0b0666e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ec7949d4-9e55-5f44-8c4a-a0e674a2a46f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ed797ade-c473-5b6a-b1e2-1fd4410f7156.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eda32e5d-3684-5205-b3a4-bbddacddc60f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eda32e5d-3684-5205-b3a4-bbddacddc60f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/edccbc31-3c4d-5d38-af6a-7fd1d9860bff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ede1488a-e8cd-5d5f-a25d-96c136695594.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ede1488a-e8cd-5d5f-a25d-96c136695594.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eeb00e89-7125-58e8-9248-b9f429583277.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eeb00e89-7125-58e8-9248-b9f429583277.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eed3e284-5030-56db-b749-01d7120dc577.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eed3e284-5030-56db-b749-01d7120dc577.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ef3852ff-b0f9-51d5-af6d-b1b1fed72005.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'efec59bf-4563-5da7-a1db-f5c28e93b21f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/efec59bf-4563-5da7-a1db-f5c28e93b21f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f00c266c-0e28-5c49-b2b0-cd97603341ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f00c266c-0e28-5c49-b2b0-cd97603341ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f1322e13-3fb3-5c9c-be8e-29d4ae293d22.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f44d0940-2e62-5993-9028-d3e63ae23960.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f44d0940-2e62-5993-9028-d3e63ae23960.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f507bb23-1a9d-55dd-8edc-19a33e64d646.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f507bb23-1a9d-55dd-8edc-19a33e64d646.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f512a987-4f86-5fb3-b202-6b5de22a739f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f512a987-4f86-5fb3-b202-6b5de22a739f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f55af438-f955-51d3-b42f-60b0d48d86e4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f55af438-f955-51d3-b42f-60b0d48d86e4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f5f029ea-d16e-5661-bc66-3096aaeda2f3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f62488d2-4b52-57d4-8ecd-d8f47dcb3dda.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f6cfd4ce-1b96-5871-aa9d-8dba2d701579.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f6d0110b-51c5-54db-a531-29b0cb58d0f2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f78dad83-1fe2-5aba-8507-64ea9efb53d6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f8c6e5cf-cfce-5c11-b303-a20c7c1cd694.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f9344da7-b640-5587-98b8-9d9066000883.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f9344da7-b640-5587-98b8-9d9066000883.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fa9bbc09-3b1f-5344-a4a4-523a899a35b7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fb4368ab-cdee-5188-814c-a8197411ba22.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fb4368ab-cdee-5188-814c-a8197411ba22.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fb8759d0-8564-572c-9042-d395b7e0b74d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fb8759d0-8564-572c-9042-d395b7e0b74d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fcc4b1b4-13e6-5908-be80-7ed36211de90.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fcc4b1b4-13e6-5908-be80-7ed36211de90.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fd42f0d0-6e1d-53e5-b322-9a0eaa56948b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fdff0b83-dc73-5d60-9ad3-b98ed139a1b4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fe083488-fa0f-5408-9624-ac27607ac2ff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fe083488-fa0f-5408-9624-ac27607ac2ff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fe219241-4b9c-585f-b982-bb248852baa1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fe219241-4b9c-585f-b982-bb248852baa1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ffc9fb91-dc44-512b-a558-036e8ce11282.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ffc9fb91-dc44-512b-a558-036e8ce11282.json',
                },
              ],
              index_pattern: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b.json',
                },
              ],
            },
            elasticsearch: {
              ilm: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ilm',
                  file: 'default_policy.json',
                  dataset: 'findings',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/findings/elasticsearch/ilm/default_policy.json',
                },
              ],
              ingest_pipeline: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ingest_pipeline',
                  file: 'default.yml',
                  dataset: 'findings',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/findings/elasticsearch/ingest_pipeline/default.yml',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ingest_pipeline',
                  file: 'default.yml',
                  dataset: 'vulnerabilities',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/vulnerabilities/elasticsearch/ingest_pipeline/default.yml',
                },
              ],
            },
          },
          policy_templates: [
            {
              name: 'kspm',
              title: 'Kubernetes Security Posture Management (KSPM)',
              description: 'Identify & remediate configuration risks in Kubernetes',
              data_streams: ['findings'],
              inputs: [
                {
                  type: 'cloudbeat/cis_k8s',
                  title: 'CIS Kubernetes Benchmark',
                  description: 'CIS Benchmark for Kubernetes',
                },
                {
                  type: 'cloudbeat/cis_eks',
                  title: 'Amazon EKS Benchmark',
                  description: 'CIS Benchmark for Amazon Elastic Kubernetes Service (EKS)',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_kspm.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_kspm.svg',
                  title: 'KSPM logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['containers', 'kubernetes', 'security', 'aws'],
              screenshots: [
                {
                  src: '/img/dashboard.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/dashboard.png',
                  title: 'Dashboard page',
                  size: '1293x718',
                  type: 'image/png',
                },
              ],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/kspm.md',
            },
            {
              name: 'cspm',
              title: 'Cloud Security Posture Management (CSPM)',
              description:
                'Identify & remediate configuration risks in the Cloud services you leverage',
              data_streams: ['findings'],
              inputs: [
                {
                  type: 'cloudbeat/cis_aws',
                  vars: [
                    {
                      name: 'cloud_formation_template',
                      type: 'text',
                      title: 'CloudFormation Template',
                      description: 'Template URL to Cloud Formation Quick Create Stack',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.14.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
                    },
                  ],
                  title: 'Amazon Web Services',
                  description: 'CIS Benchmark for Amazon Web Services Foundations',
                },
                {
                  type: 'cloudbeat/cis_gcp',
                  vars: [
                    {
                      name: 'cloud_shell_url',
                      type: 'text',
                      title: 'CloudShell URL',
                      description: 'A URL to CloudShell for creating a new deployment',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://shell.cloud.google.com/cloudshell/?ephemeral=true&cloudshell_git_repo=https%3A%2F%2Fgithub.com%2Felastic%2Fcloudbeat&cloudshell_git_branch=8.14&cloudshell_workspace=deploy%2Fdeployment-manager&show=terminal',
                    },
                  ],
                  title: 'GCP',
                  description: 'CIS Benchmark for Google Cloud Platform Foundations',
                },
                {
                  type: 'cloudbeat/cis_azure',
                  vars: [
                    {
                      name: 'arm_template_url',
                      type: 'text',
                      title: 'ARM Template URL',
                      description: 'A URL to the ARM Template for creating a new deployment',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fcloudbeat%2F8.14%2Fdeploy%2Fazure%2FARM-for-ACCOUNT_TYPE.json',
                    },
                  ],
                  title: 'Azure',
                  description: 'CIS Benchmark for Microsoft Azure Foundations',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_cspm.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_cspm.svg',
                  title: 'CSPM logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['security', 'cloud', 'aws', 'google_cloud'],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/cspm.md',
            },
            {
              name: 'vuln_mgmt',
              title: 'Cloud Native Vulnerability Management (CNVM)',
              description: 'Scan for cloud workload vulnerabilities',
              data_streams: ['vulnerabilities'],
              inputs: [
                {
                  type: 'cloudbeat/vuln_mgmt_aws',
                  vars: [
                    {
                      name: 'cloud_formation_template',
                      type: 'text',
                      title: 'CloudFormation Template',
                      description: 'Template URL to Cloud Formation Quick Create Stack',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cnvm-8.14.0.yml&stackName=Elastic-Vulnerability-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
                    },
                  ],
                  title: 'Amazon Web Services Vulnerability Management',
                  description: 'Vulnerability scan over running resources',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_vuln_mgmt.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_vuln_mgmt.svg',
                  title: 'Vulnerability Management logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['security', 'cloud'],
              screenshots: [
                {
                  src: '/img/cnvm_vulnerabilities_table.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/cnvm_vulnerabilities_table.png',
                  title: 'Vulnerabilities Table',
                  size: '3420x1912',
                  type: 'image/png',
                },
                {
                  src: '/img/cnvm_vulnerabilities_flyout.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/cnvm_vulnerabilities_flyout.png',
                  title: 'Vulnerability',
                  size: '3452x1926',
                  type: 'image/png',
                },
              ],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/vuln_mgmt.md',
            },
          ],
          data_streams: [
            {
              type: 'logs',
              dataset: 'cloud_security_posture.findings',
              ilm_policy: 'logs-cloud_security_posture.findings-default_policy',
              title: 'Cloud Security Posture Findings',
              release: 'beta',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'cloudbeat/cis_k8s',
                  template_path: 'vanilla.yml.hbs',
                  title: 'CIS Kubernetes Benchmark',
                  description: 'CIS Benchmark for Kubernetes',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_eks',
                  vars: [
                    {
                      name: 'access_key_id',
                      type: 'text',
                      title: 'Access Key ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'secret_access_key',
                      type: 'text',
                      title: 'Secret Access Key',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'session_token',
                      type: 'text',
                      title: 'Session Token',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'shared_credential_file',
                      type: 'text',
                      title: 'Shared Credential File',
                      description: 'Directory of the shared credentials file',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'credential_profile_name',
                      type: 'text',
                      title: 'Credential Profile Name',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'role_arn',
                      type: 'text',
                      title: 'ARN Role',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.credentials.type',
                      type: 'text',
                      title: 'Credential type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                  ],
                  template_path: 'eks.yml.hbs',
                  title: 'Amazon EKS Benchmark',
                  description: 'CIS Benchmark for Amazon Elastic Kubernetes Service (EKS)',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_aws',
                  vars: [
                    {
                      name: 'access_key_id',
                      type: 'text',
                      title: 'Access Key ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'secret_access_key',
                      type: 'text',
                      title: 'Secret Access Key',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'session_token',
                      type: 'text',
                      title: 'Session Token',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'shared_credential_file',
                      type: 'text',
                      title: 'Shared Credential File',
                      description: 'Directory of the shared credentials file',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'credential_profile_name',
                      type: 'text',
                      title: 'Credential Profile Name',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'role_arn',
                      type: 'text',
                      title: 'ARN Role',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.account_type',
                      type: 'text',
                      title: 'Fetch resources from AWS organization instead of single account',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                  ],
                  template_path: 'aws.yml.hbs',
                  title: 'CIS AWS Benchmark',
                  description: 'CIS Benchmark for Amazon Web Services Foundations',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_gcp',
                  vars: [
                    {
                      name: 'gcp.account_type',
                      type: 'text',
                      title: 'Account Type',
                      multi: false,
                      required: true,
                      show_user: false,
                    },
                    {
                      name: 'gcp.organization_id',
                      type: 'text',
                      title: 'Organization Id',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'gcp.project_id',
                      type: 'text',
                      title: 'Project Id',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'gcp.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'gcp.credentials.file',
                      type: 'text',
                      title: 'Credentials file',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'gcp.credentials.json',
                      type: 'text',
                      title: 'Credentials json',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                  ],
                  template_path: 'gcp.yml.hbs',
                  title: 'CIS GCP Benchmark',
                  description: 'CIS Benchmark for Google Cloud Platform Foundation',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_azure',
                  vars: [
                    {
                      name: 'azure.account_type',
                      type: 'text',
                      title: 'Account type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'azure.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'azure.credentials.client_id',
                      type: 'text',
                      title: 'Client ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.tenant_id',
                      type: 'text',
                      title: 'Tenant ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_secret',
                      type: 'text',
                      title: 'Client Secret',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_username',
                      type: 'text',
                      title: 'Client Username',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_password',
                      type: 'text',
                      title: 'Client Password',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_certificate_path',
                      type: 'text',
                      title: 'Client Certificate Path',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_certificate_password',
                      type: 'text',
                      title: 'Client Certificate Password',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                  ],
                  template_path: 'azure.yml.hbs',
                  title: 'CIS Azure Benchmark',
                  description: 'CIS Benchmark for Microsoft Azure Foundations',
                  enabled: false,
                },
              ],
              package: 'cloud_security_posture',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
                'ingest_pipeline.name': 'default',
              },
              path: 'findings',
            },
            {
              type: 'logs',
              dataset: 'cloud_security_posture.vulnerabilities',
              title: 'Cloud Vulnerabilities',
              release: 'beta',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'cloudbeat/vuln_mgmt_aws',
                  template_path: 'aws.yml.hbs',
                  title: 'Vulnerability Management AWS',
                  description:
                    'Scan for vulnerabilities over AWS account EC2 instances and docker images',
                  enabled: false,
                },
              ],
              package: 'cloud_security_posture',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
                'ingest_pipeline.name': 'default',
              },
              path: 'vulnerabilities',
            },
          ],
          vars: [
            {
              name: 'posture',
              type: 'text',
              title: 'Posture type',
              description: 'Chosen posture type (cspm/kspm)',
              multi: false,
              required: true,
              show_user: false,
            },
            {
              name: 'deployment',
              type: 'text',
              title: 'Deployment type',
              description: 'Chosen deployment type (aws/gcp/azure/eks/k8s)',
              multi: false,
              required: true,
              show_user: false,
            },
          ],
          latestVersion: '1.9.0-preview04',
          licensePath: '/package/cloud_security_posture/1.9.0-preview04/LICENSE.txt',
          keepPoliciesUpToDate: true,
          status: 'installed',
          savedObject: {
            id: 'cloud_security_posture',
            type: 'epm-packages',
            namespaces: [],
            updated_at: '2024-04-29T21:55:18.196Z',
            created_at: '2024-04-04T14:57:54.879Z',
            version: 'WzE4NzE0LDZd',
            attributes: {
              installed_kibana: [
                {
                  id: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b',
                  type: 'index-pattern',
                },
                {
                  id: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c',
                  type: 'csp-rule-template',
                },
                {
                  id: '01629238-aea8-5737-a59b-45baf8dab404',
                  type: 'csp-rule-template',
                },
                {
                  id: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9',
                  type: 'csp-rule-template',
                },
                {
                  id: '02da047f-bc78-5565-86a0-e121850f76c0',
                  type: 'csp-rule-template',
                },
                {
                  id: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae',
                  type: 'csp-rule-template',
                },
                {
                  id: '05480064-f899-53e8-b8ad-34172b09b400',
                  type: 'csp-rule-template',
                },
                {
                  id: '05676b4e-3274-5984-9981-6aa1623c24ec',
                  type: 'csp-rule-template',
                },
                {
                  id: '05c4bd94-162d-53e8-b112-e617ce74f8f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '05f0c324-5c11-576f-b7a2-35ebf66f084b',
                  type: 'csp-rule-template',
                },
                {
                  id: '06161f41-c17a-586f-b08e-c45ea5157da0',
                  type: 'csp-rule-template',
                },
                {
                  id: '06635c87-1e11-59c3-9eba-b4d8a08ba899',
                  type: 'csp-rule-template',
                },
                {
                  id: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce',
                  type: 'csp-rule-template',
                },
                {
                  id: '08d850ca-c1be-57e2-ac39-5e38f8750cf6',
                  type: 'csp-rule-template',
                },
                {
                  id: '090923c7-e599-572b-bad3-703f768c262a',
                  type: 'csp-rule-template',
                },
                {
                  id: '0bdfe13d-7bc8-5415-8517-65114d344798',
                  type: 'csp-rule-template',
                },
                {
                  id: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861',
                  type: 'csp-rule-template',
                },
                {
                  id: '0e318770-7077-5996-afd8-27ca34fc5446',
                  type: 'csp-rule-template',
                },
                {
                  id: '1054ef6c-8f47-5d20-a922-8df0ac93acfa',
                  type: 'csp-rule-template',
                },
                {
                  id: '129b07b7-4470-5224-8246-6ae975d6304b',
                  type: 'csp-rule-template',
                },
                {
                  id: '1316108c-33a8-5198-9529-45716c5a87b1',
                  type: 'csp-rule-template',
                },
                {
                  id: '151312c8-7e97-5420-ac05-5a916b3c1feb',
                  type: 'csp-rule-template',
                },
                {
                  id: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d',
                  type: 'csp-rule-template',
                },
                {
                  id: '1706a986-39d7-5900-93eb-f191f6a40892',
                  type: 'csp-rule-template',
                },
                {
                  id: '17282e92-075f-593d-99eb-99346e4288ed',
                  type: 'csp-rule-template',
                },
                {
                  id: '1915b785-942d-5613-9a24-b40394ef745f',
                  type: 'csp-rule-template',
                },
                {
                  id: '1a8ee966-458a-5ff9-a6e9-436aba157ebd',
                  type: 'csp-rule-template',
                },
                {
                  id: '1b112bf6-61ad-5b08-888b-7b6c86b3526c',
                  type: 'csp-rule-template',
                },
                {
                  id: '1b89acc6-978c-57c3-b319-680e5251d6f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '1d0a20ee-ad20-5416-84c8-32c0f69b209b',
                  type: 'csp-rule-template',
                },
                {
                  id: '1d6ff20d-4803-574b-80d2-e47031d9baa2',
                  type: 'csp-rule-template',
                },
                {
                  id: '1e180f0d-3419-5681-838b-9247927eb0f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4',
                  type: 'csp-rule-template',
                },
                {
                  id: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36',
                  type: 'csp-rule-template',
                },
                {
                  id: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37',
                  type: 'csp-rule-template',
                },
                {
                  id: '213e2b33-f2b1-575b-8753-f239b278c25a',
                  type: 'csp-rule-template',
                },
                {
                  id: '23941040-0aae-5afd-bc8d-793742133647',
                  type: 'csp-rule-template',
                },
                {
                  id: '23e5f81e-ca05-53bf-8109-7e676feecee3',
                  type: 'csp-rule-template',
                },
                {
                  id: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9',
                  type: 'csp-rule-template',
                },
                {
                  id: '26ff6dff-042f-5901-8191-0e347d113e9e',
                  type: 'csp-rule-template',
                },
                {
                  id: '27896f4b-0405-5388-bacd-182e77556711',
                  type: 'csp-rule-template',
                },
                {
                  id: '27acd88e-c64f-5e9e-9cff-2de649f92ccf',
                  type: 'csp-rule-template',
                },
                {
                  id: '28f96eda-c94e-597c-aef0-0bceee085540',
                  type: 'csp-rule-template',
                },
                {
                  id: '29cefccd-77fe-5428-8bea-3fc1390d5d1e',
                  type: 'csp-rule-template',
                },
                {
                  id: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc',
                  type: 'csp-rule-template',
                },
                {
                  id: '2d0044e3-d235-5703-9c16-729932a0131e',
                  type: 'csp-rule-template',
                },
                {
                  id: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f',
                  type: 'csp-rule-template',
                },
                {
                  id: '328a73c3-011d-5827-ae86-4e323739e4e1',
                  type: 'csp-rule-template',
                },
                {
                  id: '33299b3d-68da-5604-8c62-62690fd40c49',
                  type: 'csp-rule-template',
                },
                {
                  id: '33a612ed-8dee-554d-9dd7-857bfc31a33a',
                  type: 'csp-rule-template',
                },
                {
                  id: '34a4790c-0214-5eec-b97d-1c11ffa6861e',
                  type: 'csp-rule-template',
                },
                {
                  id: '34b16c08-cf25-5f0d-afed-98f75b5513de',
                  type: 'csp-rule-template',
                },
                {
                  id: '34c9c662-5072-5195-835e-48da9be5047f',
                  type: 'csp-rule-template',
                },
                {
                  id: '368b52f8-b468-5fc7-9e47-b1b5e040e051',
                  type: 'csp-rule-template',
                },
                {
                  id: '374309b1-b87a-58bd-b795-1067d2e8ee9f',
                  type: 'csp-rule-template',
                },
                {
                  id: '3760ac17-de0b-537d-8e74-455d132d19d2',
                  type: 'csp-rule-template',
                },
                {
                  id: '37fc1edc-a59d-5e63-a530-d3d088195865',
                  type: 'csp-rule-template',
                },
                {
                  id: '3851b212-b300-545d-8d6b-54ef71c86661',
                  type: 'csp-rule-template',
                },
                {
                  id: '38535c6f-a478-5cbb-82de-9417a3968bd6',
                  type: 'csp-rule-template',
                },
                {
                  id: '394963fa-63fd-5e81-82eb-ea1b8dfacd53',
                  type: 'csp-rule-template',
                },
                {
                  id: '3afddcd1-b745-5b3c-8623-ce4abe6878b5',
                  type: 'csp-rule-template',
                },
                {
                  id: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c',
                  type: 'csp-rule-template',
                },
                {
                  id: '3cd971cb-cf64-51ef-875b-9a7787cd97cb',
                  type: 'csp-rule-template',
                },
                {
                  id: '3d701761-f9b6-5c2d-ab99-928161d2ebbd',
                  type: 'csp-rule-template',
                },
                {
                  id: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca',
                  type: 'csp-rule-template',
                },
                {
                  id: '3ef4430e-2829-576a-a813-edc766625ea9',
                  type: 'csp-rule-template',
                },
                {
                  id: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e',
                  type: 'csp-rule-template',
                },
                {
                  id: '40ab36e3-7438-5c36-afcd-bf5f5401366e',
                  type: 'csp-rule-template',
                },
                {
                  id: '421191d6-a13c-5c78-8c5b-102e1229655f',
                  type: 'csp-rule-template',
                },
                {
                  id: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c',
                  type: 'csp-rule-template',
                },
                {
                  id: '43d5538c-17a3-5e04-9c06-ad4323bfd188',
                  type: 'csp-rule-template',
                },
                {
                  id: '449bf7bf-8070-580f-a3aa-66bc7f94a721',
                  type: 'csp-rule-template',
                },
                {
                  id: '461c5ca2-0173-5b8c-ae36-b229cffefbb2',
                  type: 'csp-rule-template',
                },
                {
                  id: '47ee9344-791e-50e4-a266-ee2ebce093a7',
                  type: 'csp-rule-template',
                },
                {
                  id: '4931d684-a386-5545-b2c4-47b836e0149b',
                  type: 'csp-rule-template',
                },
                {
                  id: '49c71814-2dbe-5204-ad07-879a80503fbc',
                  type: 'csp-rule-template',
                },
                {
                  id: '49fe9df5-e86f-5981-ac24-dcaadadc2790',
                  type: 'csp-rule-template',
                },
                {
                  id: '4a130791-cdb3-5524-b45d-1f3df79e2452',
                  type: 'csp-rule-template',
                },
                {
                  id: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5',
                  type: 'csp-rule-template',
                },
                {
                  id: '4b11956d-7985-524e-900e-20405e2baaca',
                  type: 'csp-rule-template',
                },
                {
                  id: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45',
                  type: 'csp-rule-template',
                },
                {
                  id: '4cfe4df4-4157-53bb-820f-278fe02ec960',
                  type: 'csp-rule-template',
                },
                {
                  id: '4d0a1c5a-27b5-5429-895d-e90878fcce1d',
                  type: 'csp-rule-template',
                },
                {
                  id: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8',
                  type: 'csp-rule-template',
                },
                {
                  id: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1',
                  type: 'csp-rule-template',
                },
                {
                  id: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35',
                  type: 'csp-rule-template',
                },
                {
                  id: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc',
                  type: 'csp-rule-template',
                },
                {
                  id: '50da62ee-4099-5950-ba1e-984794749f28',
                  type: 'csp-rule-template',
                },
                {
                  id: '5133d843-d913-5c1c-930f-89560b828704',
                  type: 'csp-rule-template',
                },
                {
                  id: '5382994d-59e0-54d9-a32b-dd860c467813',
                  type: 'csp-rule-template',
                },
                {
                  id: '5411a1e9-a529-5512-b556-93178e544c9e',
                  type: 'csp-rule-template',
                },
                {
                  id: '551d3a0b-36f6-51c6-ba8b-0a83926b1864',
                  type: 'csp-rule-template',
                },
                {
                  id: '551e7bcf-b231-500d-a193-d0a98163a680',
                  type: 'csp-rule-template',
                },
                {
                  id: '555cf8d5-f963-5574-a856-e06614cf9341',
                  type: 'csp-rule-template',
                },
                {
                  id: '5cdc703f-54ea-5de6-97c4-9fdb495725ef',
                  type: 'csp-rule-template',
                },
                {
                  id: '5d7e7fce-64fb-5b7b-beeb-920496c2e333',
                  type: 'csp-rule-template',
                },
                {
                  id: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0',
                  type: 'csp-rule-template',
                },
                {
                  id: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ee4897d-808b-5ad6-877b-a276f8e65076',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ee69b99-8f70-5daf-b784-866131aca3ba',
                  type: 'csp-rule-template',
                },
                {
                  id: '61ab077c-fc0f-5920-8bcf-ccc037a4139b',
                  type: 'csp-rule-template',
                },
                {
                  id: '62b717ac-bb8f-5274-a99f-5806dc4427a5',
                  type: 'csp-rule-template',
                },
                {
                  id: '64d37675-473f-5edc-882e-5b8b85b789c3',
                  type: 'csp-rule-template',
                },
                {
                  id: '64feecfc-7166-5d77-b830-bf4a8dd2e05d',
                  type: 'csp-rule-template',
                },
                {
                  id: '6588bb48-d02b-5169-a013-fe4dc115c709',
                  type: 'csp-rule-template',
                },
                {
                  id: '668cee84-c115-5166-a422-05c4d3e88c2c',
                  type: 'csp-rule-template',
                },
                {
                  id: '66cd0518-cfa3-5917-a399-a7dfde4e19db',
                  type: 'csp-rule-template',
                },
                {
                  id: '66cdd4cc-5870-50e1-959c-91443716b87a',
                  type: 'csp-rule-template',
                },
                {
                  id: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13',
                  type: 'csp-rule-template',
                },
                {
                  id: '67909c46-649c-52c1-a464-b3e81615d938',
                  type: 'csp-rule-template',
                },
                {
                  id: '68cfd04b-fc79-5877-8638-af3aa82d92db',
                  type: 'csp-rule-template',
                },
                {
                  id: '68f9d23f-882f-55d1-86c6-711413c31129',
                  type: 'csp-rule-template',
                },
                {
                  id: '69ffe7f6-bc09-5019-ba77-a2f81169e9de',
                  type: 'csp-rule-template',
                },
                {
                  id: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d',
                  type: 'csp-rule-template',
                },
                {
                  id: '6d58f558-d07a-541c-b720-689459524679',
                  type: 'csp-rule-template',
                },
                {
                  id: '6de73498-23d7-537f-83f3-08c660217e7e',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e339632-0d1c-5a7c-8ca3-fac5813932d9',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e46620d-cf63-55f9-b025-01889df276fd',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e6481f1-5ede-552b-84e5-cceed281052a',
                  type: 'csp-rule-template',
                },
                {
                  id: '70f92ed3-5659-5c95-a8f8-a63211c57635',
                  type: 'csp-rule-template',
                },
                {
                  id: '71cd1aed-48f7-5490-a63d-e22436549822',
                  type: 'csp-rule-template',
                },
                {
                  id: '72bb12e0-31c0-54f4-a409-4aace3b602be',
                  type: 'csp-rule-template',
                },
                {
                  id: '737dc646-1c66-5fb6-8fcd-1aac6402532d',
                  type: 'csp-rule-template',
                },
                {
                  id: '741aa940-22a7-5015-95d5-f94b331d774e',
                  type: 'csp-rule-template',
                },
                {
                  id: '756e1a54-b2ce-56b9-a13f-17f652d7767c',
                  type: 'csp-rule-template',
                },
                {
                  id: '76be4dd2-a77a-5981-a893-db6770b35911',
                  type: 'csp-rule-template',
                },
                {
                  id: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100',
                  type: 'csp-rule-template',
                },
                {
                  id: '77d274cb-69ae-5a85-b8f6-ba192aee8af4',
                  type: 'csp-rule-template',
                },
                {
                  id: '7a2ab526-3440-5a0f-804c-c5eea8158053',
                  type: 'csp-rule-template',
                },
                {
                  id: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be',
                  type: 'csp-rule-template',
                },
                {
                  id: '7c908585-ec93-52dc-81bb-ceb17cd4c313',
                  type: 'csp-rule-template',
                },
                {
                  id: '7d1de53a-a32e-55c0-b412-317ed91f65e0',
                  type: 'csp-rule-template',
                },
                {
                  id: '7e584486-4d0f-5edb-8a64-7ee0b59333b8',
                  type: 'csp-rule-template',
                },
                {
                  id: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179',
                  type: 'csp-rule-template',
                },
                {
                  id: '80db9189-cd4d-572a-94dc-e635ee8af7fa',
                  type: 'csp-rule-template',
                },
                {
                  id: '81554879-3338-5208-9db3-efb2a549d38c',
                  type: 'csp-rule-template',
                },
                {
                  id: '8233dcc7-c6af-5110-b7d4-239a70d7bed5',
                  type: 'csp-rule-template',
                },
                {
                  id: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4',
                  type: 'csp-rule-template',
                },
                {
                  id: '84862c2c-4aba-5458-9c5f-12855091617b',
                  type: 'csp-rule-template',
                },
                {
                  id: '84b8b7be-d917-50f3-beab-c076d0098d83',
                  type: 'csp-rule-template',
                },
                {
                  id: '84c7925a-42ff-5999-b784-ab037f6242c6',
                  type: 'csp-rule-template',
                },
                {
                  id: '873e6387-218d-587a-8fa1-3d65f4a77802',
                  type: 'csp-rule-template',
                },
                {
                  id: '875c1196-b6c7-5bc9-b255-e052853c3d08',
                  type: 'csp-rule-template',
                },
                {
                  id: '87952b8d-f537-5f8a-b57b-63a31b031170',
                  type: 'csp-rule-template',
                },
                {
                  id: '882ffc80-73e9-56aa-ae72-73b39af6702f',
                  type: 'csp-rule-template',
                },
                {
                  id: '88634421-e47c-59fb-9466-a86023f20dd5',
                  type: 'csp-rule-template',
                },
                {
                  id: '88734e31-d055-58ba-bf70-7d40d0b4e707',
                  type: 'csp-rule-template',
                },
                {
                  id: '89a294ae-d736-51ca-99d4-0ea4782caed0',
                  type: 'csp-rule-template',
                },
                {
                  id: '89b58088-54f6-55dc-96a3-f08ac4b27ea3',
                  type: 'csp-rule-template',
                },
                {
                  id: '89cc8ff0-be81-55f2-b1cf-d7db1e214741',
                  type: 'csp-rule-template',
                },
                {
                  id: '89ebec6b-3cc4-5898-a3b9-534174f93051',
                  type: 'csp-rule-template',
                },
                {
                  id: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a',
                  type: 'csp-rule-template',
                },
                {
                  id: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2',
                  type: 'csp-rule-template',
                },
                {
                  id: '8d3f2919-da46-5502-b48b-9ba41d03281b',
                  type: 'csp-rule-template',
                },
                {
                  id: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75',
                  type: 'csp-rule-template',
                },
                {
                  id: '8f2644ed-70b5-576f-b9b9-aabea6821749',
                  type: 'csp-rule-template',
                },
                {
                  id: '8f88e7f7-6924-5913-bc18-95fcdc5ae744',
                  type: 'csp-rule-template',
                },
                {
                  id: '900567f0-4c2f-543a-b5cf-d11223a772a2',
                  type: 'csp-rule-template',
                },
                {
                  id: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3',
                  type: 'csp-rule-template',
                },
                {
                  id: '9126cd85-611c-5b06-b2f2-a18338e26ae1',
                  type: 'csp-rule-template',
                },
                {
                  id: '919ef7a7-126c-517e-aa35-fb251b1ad587',
                  type: 'csp-rule-template',
                },
                {
                  id: '91d52d43-da61-5ba2-a4d4-1018fee84559',
                  type: 'csp-rule-template',
                },
                {
                  id: '92077c86-0322-5497-b94e-38ef356eadd6',
                  type: 'csp-rule-template',
                },
                {
                  id: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d',
                  type: 'csp-rule-template',
                },
                {
                  id: '9259a915-0294-54d6-b379-162ceb36e875',
                  type: 'csp-rule-template',
                },
                {
                  id: '9272d2b5-4e25-5658-8a6c-d917f60134ec',
                  type: 'csp-rule-template',
                },
                {
                  id: '92ab0102-d825-52ce-87a8-1d0b4e06166c',
                  type: 'csp-rule-template',
                },
                {
                  id: '933268ec-44e8-5fba-9ed7-535804521cc7',
                  type: 'csp-rule-template',
                },
                {
                  id: '934583bd-306a-51d9-a730-020bd45f7f01',
                  type: 'csp-rule-template',
                },
                {
                  id: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c',
                  type: 'csp-rule-template',
                },
                {
                  id: '93808f1f-f05e-5e48-b130-5527795e6158',
                  type: 'csp-rule-template',
                },
                {
                  id: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e',
                  type: 'csp-rule-template',
                },
                {
                  id: '94fb43f8-90da-5089-b503-66a04faa2630',
                  type: 'csp-rule-template',
                },
                {
                  id: '94fbdc26-aa6f-52e6-9277-094174c46e29',
                  type: 'csp-rule-template',
                },
                {
                  id: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b',
                  type: 'csp-rule-template',
                },
                {
                  id: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a',
                  type: 'csp-rule-template',
                },
                {
                  id: '9718b528-8327-5eef-ad21-c8bed5532429',
                  type: 'csp-rule-template',
                },
                {
                  id: '97504079-0d62-5d0a-9939-17b57b444547',
                  type: 'csp-rule-template',
                },
                {
                  id: '9a0d57ac-a54d-5652-bf07-982d542bf296',
                  type: 'csp-rule-template',
                },
                {
                  id: '9a9d808f-61a9-55b7-a487-9d50fd2983c5',
                  type: 'csp-rule-template',
                },
                {
                  id: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb',
                  type: 'csp-rule-template',
                },
                {
                  id: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f',
                  type: 'csp-rule-template',
                },
                {
                  id: '9c2d1c63-7bf3-584d-b87a-043853dad7a4',
                  type: 'csp-rule-template',
                },
                {
                  id: '9ce2276b-db96-5aad-9329-08ce874c5db6',
                  type: 'csp-rule-template',
                },
                {
                  id: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b',
                  type: 'csp-rule-template',
                },
                {
                  id: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fb9a46f-de59-580b-938e-829090bd3975',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fcbc87c-0963-58ba-8e21-87e22b80fc27',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a1f327c0-3e4b-5b55-891a-b91e720cd535',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a22a5431-1471-534c-8e7c-1e16fe0a857c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a2447c19-a799-5270-9e03-ac322c2396d5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a501efd2-73b9-5f92-a2c7-fa03ae753140',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a52c1d16-d925-545d-bbd9-4257c2485eea',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a6074b1d-e115-5416-bdc5-6e1940effd09',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a7c6b368-29db-53e6-8b86-dfaddf719f59',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a97eb244-d583-528c-a49a-17b0aa14decd',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba',
                  type: 'csp-rule-template',
                },
                {
                  id: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11',
                  type: 'csp-rule-template',
                },
                {
                  id: 'aa4374f0-adab-580c-ac9d-907fd2783219',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'abc6f4b4-3add-57c4-973d-c678df60804c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ad4de26d-02a8-5202-b718-48147bf0fd03',
                  type: 'csp-rule-template',
                },
                {
                  id: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b0a70444-c719-5772-a8c1-2cd72578f8ee',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b190337a-56a7-5906-8960-76fd05283599',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b1b40df2-f562-564a-9d43-94774e1698d1',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b287617d-7623-5d72-923d-e79b1301e06c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b2909440-5ad0-522e-8db0-9439d573b7d5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b4133ca4-32f1-501e-ad0a-a22700208a4f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b449135c-8747-58fe-9d46-218728745520',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b5493b70-e25f-54e6-9931-36138c33f775',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b64386ab-20fa-57d2-9b5b-631d64181531',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b794635d-a338-5b4e-bfa0-75257e854c6a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b8c40039-034b-5299-8660-a7c8d34efe36',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b8f1182a-1b3e-5b08-8482-f74949163e97',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b96194c6-8eb7-5835-852d-47b84db83697',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ba545cc3-f447-5d14-8841-d3d3c05024e8',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bb264405-de3e-5b91-9654-2056f905fc67',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'be1197db-90d0-58db-b780-f0a939264bd0',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c0ef1e12-b201-5736-8475-4b62978084e8',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c1e1ca12-c0e2-543e-819d-22249927d241',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c28e606d-f6a7-58b2-820f-e2fb702bf956',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c2b36f84-34b5-57fd-b9b0-f225be981497',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c2d65e60-221b-5748-a545-579a69ad4a93',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c40bebb5-5403-59d8-b960-00d6946931ce',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c43a57db-5248-5855-a613-2a05d0a42768',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c444d9e3-d3de-5598-90e7-95a922b51664',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c455dba0-a768-5c76-8509-3484ec33102f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c52e86bd-55f1-5c6a-8349-918f97963346',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c53dab24-a23f-53c6-8d36-f64cc03ab277',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c8a8f827-fba6-58ee-80b8-e64a605a4902',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c8f24be5-fd7d-510f-ab93-2440bb826750',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cb57543f-5435-55b5-97cf-bda29ec9094a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cda5f949-378c-5ef6-a65e-47187af983e4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd1d73385-2909-598a-acf7-bf1d8130f314',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd248e880-7d96-5559-a25c-0f56c289a2e7',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd303c4f1-489c-56ca-add9-29820c2214af',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd3d725bd-652f-573e-97f5-adfd002fab8e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd498d11f-6c2a-5593-b6c6-6960b28da84e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd57d6506-a519-5a29-a816-b1204ebfef21',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dafb527b-9869-5062-8d38-c9dced4a27c2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'db28165f-6f7c-5450-b9f3-61c7b897d833',
                  type: 'csp-rule-template',
                },
                {
                  id: 'db58a1e4-de58-5899-bee8-f6ced89d6f80',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dfc17731-aa8f-5ecc-878b-113d1db009ca',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e073f962-74d9-585b-ae5a-e37c461e9b7c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e1b73c05-5137-5b65-9513-6f8018b6deff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e2306922-4f95-5660-bf2e-9610f556de69',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e24bf247-bfdc-5bbf-9813-165b905b52e6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e3c6b85b-703e-5891-a01f-640d59ec449e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e570dc22-4f5d-51db-a193-983cb7d20afe',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e92ddce9-3cba-5e3d-adac-53df0350eca0',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ea3378aa-250e-50d8-9260-ff8237cf09a2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eda32e5d-3684-5205-b3a4-bbddacddc60f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ede1488a-e8cd-5d5f-a25d-96c136695594',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eeb00e89-7125-58e8-9248-b9f429583277',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eed3e284-5030-56db-b749-01d7120dc577',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005',
                  type: 'csp-rule-template',
                },
                {
                  id: 'efec59bf-4563-5da7-a1db-f5c28e93b21f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f00c266c-0e28-5c49-b2b0-cd97603341ec',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f44d0940-2e62-5993-9028-d3e63ae23960',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f507bb23-1a9d-55dd-8edc-19a33e64d646',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f512a987-4f86-5fb3-b202-6b5de22a739f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f55af438-f955-51d3-b42f-60b0d48d86e4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f9344da7-b640-5587-98b8-9d9066000883',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fb4368ab-cdee-5188-814c-a8197411ba22',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fb8759d0-8564-572c-9042-d395b7e0b74d',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fcc4b1b4-13e6-5908-be80-7ed36211de90',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fe083488-fa0f-5408-9624-ac27607ac2ff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fe219241-4b9c-585f-b982-bb248852baa1',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ffc9fb91-dc44-512b-a558-036e8ce11282',
                  type: 'csp-rule-template',
                },
              ],
              installed_kibana_space_id: 'default',
              installed_es: [
                {
                  id: 'logs-cloud_security_posture.findings-default_policy',
                  type: 'data_stream_ilm_policy',
                },
                {
                  id: 'logs-cloud_security_posture.findings-1.9.0-preview04',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities-1.9.0-preview04',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-cloud_security_posture.findings',
                  type: 'index_template',
                },
                {
                  id: 'logs-cloud_security_posture.findings@package',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.findings@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities',
                  type: 'index_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities@package',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities@custom',
                  type: 'component_template',
                },
              ],
              package_assets: [
                {
                  id: '6c67c2ff-1c6e-502b-b7df-d4aed729b404',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c9d77a3e-a19a-5a8c-8efa-29210cbfb45f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7d6dd123-3d48-535e-948d-9a1d57f7fb04',
                  type: 'epm-packages-assets',
                },
                {
                  id: '251376a1-999a-5c58-a16a-332e9b93cd20',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de81d4e3-cf3e-53fc-9a98-6c9ea7e0f4f5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0058332a-7d34-5538-b2e3-1799fee177f6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c968afe0-4691-5a55-9df6-63ccca93b962',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0e559a63-e86c-5f38-a148-1e290adf8f0c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f1194836-e317-58c1-9bbd-869e771e0bff',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e2393e1b-6bb2-5a7c-9025-60b261b14ff3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '24c048df-d5f0-51f4-941a-c8ed49a121ba',
                  type: 'epm-packages-assets',
                },
                {
                  id: '936ae162-1f6b-5107-a62e-df3a41d080a0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '18c04730-10da-50d5-9c82-3a3c91edb2b3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7172fb5b-dd51-5ab2-8e7f-9a2b68f5d25c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '81bdd27f-58db-5baa-b3c4-0c2971711af7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7d84cdbd-9cb8-5f55-b5dd-2f0c1ee2685f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '26261d50-15b4-573b-be15-0191777bf633',
                  type: 'epm-packages-assets',
                },
                {
                  id: '97c0aa5a-b34f-5ba4-b694-b6183d631b8a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6a54a6f7-fa7a-53a0-bf34-dba476486044',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c18fba7f-a8a7-550d-9809-9de2f9988d15',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5137c9ce-dd2d-5f45-b7a1-86cfedfdf761',
                  type: 'epm-packages-assets',
                },
                {
                  id: '24b875e6-e24a-5870-8e11-a5e687a8c345',
                  type: 'epm-packages-assets',
                },
                {
                  id: '95940d7c-ab53-5ab6-a859-3e8a8e4c4cb9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c84cf1d6-d1ae-5cfa-9c30-051db89051ce',
                  type: 'epm-packages-assets',
                },
                {
                  id: '556fb842-5f49-5a74-9371-011e65fadc0c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a93ba572-4309-5d29-89a1-f67d9639d8a3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c97ace33-b843-5e68-9ec1-2eb92cf77209',
                  type: 'epm-packages-assets',
                },
                {
                  id: '287a331b-5c7a-5a52-9d21-d80d927e004a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '78c46ab0-f847-5787-90ab-5d487e802154',
                  type: 'epm-packages-assets',
                },
                {
                  id: '700a8c26-a92a-5305-88a3-48991a32c780',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c72cd88e-b692-5dd5-a1f6-6b598af71e0a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c33205e8-4b05-5a14-93a9-99c06b1e3ecb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a13bb712-6ec5-5f9e-a6ef-caa310b24860',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3692f463-a54b-5e3b-8f8f-df00a2a1de50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f3f8282-c0d0-5972-9db5-847290e0c472',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0382d885-8a6a-58d2-bca1-785259aee70d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b49519bd-cb20-5dcf-b388-7619c697a9af',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98aab00f-a323-5176-9d12-960ab0dd366a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '63436911-ece8-5f22-92dd-1b26c73e2913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35b74f54-ed07-56a9-be20-454cc7095221',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0f1e7ff2-e694-5266-a276-f9a9e4b2f82b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a4fd9648-c7d1-5e1a-997d-a20b43b2cbd8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1a798101-4fbd-52f8-91ab-ee6ce3f30c35',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b5b41185-d6cd-5376-9fac-f8488c2a86d2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '05ba9b33-ddd9-52dd-85af-36f2ae393cdd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f503b25f-56d5-524a-b961-aaa9fb982768',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5deb3ade-fd8b-59f2-95a4-b5b3dded9e50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4db8aa0f-057b-5737-9a5d-dd9605fa824a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c413adb4-acd6-5d4a-bcfa-d8468b9eed6a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f6078ee-beba-5a4f-aa4b-cc2f6dbb6880',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e5fe01ed-7609-5dc1-baf7-12b1fe8ab40b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a5ab9a4b-7f4b-5b25-9857-674d756543b8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '60b2e324-010a-5ccc-bcd7-85206a6828b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd998cd45-47e4-51c1-97eb-750703db8791',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bfd12812-5020-543f-9ea8-37da89dfcf0a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '60a4ddb0-c9ad-5218-87f9-be04b1abfffc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b571789f-9ad4-543c-83db-2e169167e078',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c1a18561-75a0-5057-b9de-a3a59383b67d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'efc93b14-6b30-55b5-86ef-01f15fa8573f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0a838743-1d6c-57eb-b69e-c7a9049be5cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ef15777f-1ce7-532f-8580-60754401476e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f48ba41e-768b-549d-8a37-606330662521',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ea42b013-3233-5e90-895a-944c39f12591',
                  type: 'epm-packages-assets',
                },
                {
                  id: '37dd8651-4bb4-59d6-b627-b4b80926b283',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7f04250c-e782-5544-8dfa-f85eab593a9a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2f64482c-dfae-54b3-aab2-1a409a696efa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '55aa37aa-8d70-5ee1-af15-ec272054b278',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3665b5e4-1a2a-5141-ad4f-f4b8d57f5826',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c880d19-7341-57aa-a49f-7a9f4ac10521',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9d199a97-8680-55ba-873e-2455c2fe9915',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fe778031-b235-5277-bdd3-8fd5bd1afe82',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cf9f8f6a-f9f0-578f-a8bf-a4d16157abd1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0234baac-ae13-5b8d-a169-81f9d294d7ac',
                  type: 'epm-packages-assets',
                },
                {
                  id: '737ff338-bf97-5323-a385-66e2a49e5fa6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '373a7bbc-d11f-57f5-80df-3d7083cd2ed7',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de50e36b-828b-5516-a172-b267f1a2112f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5a5659b5-f07c-5b0d-b458-a778cf4d9493',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fb6e4b1e-3d8f-5784-9322-fb5eb2566df4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '62789ad7-a927-505d-b216-822a1e9401c5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4b43b3e1-8ee0-547f-9e09-2a81815107fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3321336b-5bf0-512f-996f-b556108ad50b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1455fe35-71b3-5205-aec9-441a37683fd1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e82b2b7-65a2-57fa-aeef-59899e78952c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0b360047-92e3-5b7b-a35d-13ba06575789',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f326b361-8416-5eba-8654-ff47658c49a8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5a2900c9-a03d-53b6-bb11-34c364b8553f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f14f2707-00ed-5e4e-bab0-acca2932988b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c55455ce-e4c7-5a0f-bae1-8b39fa598282',
                  type: 'epm-packages-assets',
                },
                {
                  id: '48b4b8fb-48b3-5411-860e-f40b967e657c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2f8fd7e3-393e-5ed1-aa7b-8167b5b9f913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '13108afe-fc03-5c62-865f-be72d3eeec93',
                  type: 'epm-packages-assets',
                },
                {
                  id: '885e3e1d-b894-5e51-b45c-119aea1b84f8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '88624517-af46-59e1-8fd1-bab876bb9df3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e534f997-4a33-5d4e-b4b8-ac5d606c1a84',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4bc97420-edda-5b5d-ae5b-9ed10540a613',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3125eb5d-01d8-59cf-8006-8df09282bcd4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '26b50f35-c045-5247-8251-2760cebab05f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09b21fe2-e280-5319-802c-79c6d12b293b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b6284126-8789-515a-bb2d-0d1b77d19179',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2cf19643-fa43-59c9-bd18-9c9037d08b51',
                  type: 'epm-packages-assets',
                },
                {
                  id: '99b524df-21cf-5529-a3d6-0d901f7d743b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'def4879d-7555-5593-b2f4-138bcfb89776',
                  type: 'epm-packages-assets',
                },
                {
                  id: '85aa0aeb-e6c3-54e8-9dce-a86d2c4e4216',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c73a148-cbff-5b93-a2a0-5f4888565904',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e7a0e733-b3c1-5226-b1ae-b29053ba3b5f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '646c2db9-4a8d-5329-8450-26e3678abbf7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '798d35d0-a301-5d06-9988-f90d5d7c7769',
                  type: 'epm-packages-assets',
                },
                {
                  id: '27705163-a242-5c9d-98d2-cbd1d7dc9913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9c51c060-18ee-52c4-ab53-4f9e12101741',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e77da34-18fd-5317-b269-bad95bd34b04',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6b506869-3032-58e0-a8f7-d59daeefae13',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c96bd10-7b67-500e-9ef3-2c0381bfa91e',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9bd90bbc-697a-5ff2-9801-f47a02f70a24',
                  type: 'epm-packages-assets',
                },
                {
                  id: '496514fa-ea74-5a9b-9272-8d9ce856687f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd8ffeadf-0501-560b-86ef-b41e9e0e3b7b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5fdb0448-d776-5f1b-9317-2bd9fb3cfffb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fffca49b-479c-557e-94b3-73b45ba7c1f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3913c2ab-212a-5d24-bedb-22f6f0e26186',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c72ea62c-b283-5bed-b932-6805a83fa52c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0871445a-03c8-5701-910d-861999c0df5b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '67e7fea4-fa50-5a36-b1bd-1267eca4082a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '61981457-7dff-50bd-92cd-80b3e832699d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2213e8fe-2a5a-5ed8-b426-98dd14c84261',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f4882d1d-aa6a-5da2-9612-4862ba13c1b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fc2c1038-97cd-5f89-b540-7629991fa216',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'afa7f0de-123f-5232-82e5-7e03507c3248',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35e4af4a-7ac8-5038-b73f-bf187b17f6eb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a64f3661-46a3-5db8-9d9d-b594c4df423d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '85cfc1a7-edf4-569a-abcb-5ef86c338019',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2ebcbca2-6552-59ee-bfdf-844083fa92ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '907c831c-4326-55b9-a9b3-b98028c5b219',
                  type: 'epm-packages-assets',
                },
                {
                  id: '68a5e71d-3f99-5d9a-bc28-a59e5d90bd9a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a4f9d960-dd5d-53b0-82fc-a64684b380d4',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd534d71a-b733-5ce1-b522-f7a75c0b3271',
                  type: 'epm-packages-assets',
                },
                {
                  id: '92677ec3-039a-5bca-b56c-2337fd0b7e64',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bbca04ee-79a1-5f82-8ded-fd4a902886d0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2a3652a0-8eed-5a2c-b2b1-a9ca96f589bb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f4c23e6-88b8-5795-a09b-b2c32879492b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f9eeb0f1-237a-54e8-b672-712104182ae6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '97bc9a09-7926-590f-897c-772c973cb35b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bcad896c-ad50-5236-b098-795c7c50b2dd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '86e7b03d-c5fa-5a2d-8d4d-2544bf69eb2e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cfa682ad-99a7-57ed-9a0a-b8f3b8aa173d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2109aef8-b158-52f1-86a2-0061363530ac',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd29fca21-f127-5f14-a5b8-ca1c5dd8d3cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ca8cecf6-5ef2-566f-bb39-b1b7fabacdae',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2d1f5109-8914-5e3a-9b70-0e9904a29067',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1e60d776-c44c-56af-bc32-50cbed228d44',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b2b985d1-aabd-57af-9f8e-e67317bb118d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b147313-ea4f-537f-91e3-1543d517ee95',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e2ae868b-ff6c-5702-b15a-5e6e3d5078aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '46408db9-4c57-544b-9cb2-0513780ef44f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4d794d07-58ca-58f7-9cb5-ec35c6a8a1e5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8ff8219e-0f39-5b0a-a85a-09d6525d5c4c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd5016250-092c-55a0-a516-10cef385bc92',
                  type: 'epm-packages-assets',
                },
                {
                  id: '62855857-66bf-5b58-add0-213ae5ccfe43',
                  type: 'epm-packages-assets',
                },
                {
                  id: '133607eb-1322-54fc-886d-44389c9f1222',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9ded7ca5-d65f-5f3b-92c3-1341eab9c9fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98bbe91a-dd3d-58a4-b211-f5f6556bc0cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5d896f47-421f-53d6-8aa7-d717a539e6fc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd7985b56-9c10-5433-aece-b8543f720e6f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f43c5a86-aea6-5901-b69e-7782d942edf6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '830cd395-da1a-5d6d-a1df-b31ee564efc6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '36db99c5-f92f-53d2-80ee-5337423c6c74',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f4c7e04-743a-5537-afc9-6395f3e71622',
                  type: 'epm-packages-assets',
                },
                {
                  id: '80667605-6df9-5dac-a90e-e9ce199a93e3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7aac4803-44a2-58a9-b89d-3bd28891ca32',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9409357d-a366-5b81-87b7-322b83f01a02',
                  type: 'epm-packages-assets',
                },
                {
                  id: '36440c61-e18c-56bc-93e4-955a98a9d515',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ffb529d6-ea9f-5dbd-bbab-25dc66ccaf8e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c6657406-dde4-5e52-a8c2-2dcb67591933',
                  type: 'epm-packages-assets',
                },
                {
                  id: '19535ecd-2672-53a9-982f-a479c91da3aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'baa41f5e-5fc0-5e57-a8c6-368bc2da8999',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'caa5c47e-8e8e-5a95-9841-d0ded08c8cf7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '650573f7-7fa1-58b8-814d-fc16da830abe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a3a6654-f5ae-58a9-9934-39ee5c0e6a36',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e25e52e3-b954-500b-88ee-a64f15eb9e06',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1c454c96-048b-5923-8373-d31d759c1957',
                  type: 'epm-packages-assets',
                },
                {
                  id: '01264f04-c643-5af3-8bc7-6ccd77139d2a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '628de269-a153-51d0-9897-986b367cac73',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0b568d99-e250-5303-911c-d5df0d7f957e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f5cf4600-ac2a-537a-ae7a-3bd2326c8218',
                  type: 'epm-packages-assets',
                },
                {
                  id: '44b8d605-b7b7-589c-a788-0ba1b75212ed',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9123b1ca-cf76-564d-aee8-7831a81044ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2de37832-710a-59f9-8fc3-773d61f962ad',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c7922bab-bafd-5539-810c-659893ca180c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4d2aa753-063d-5493-b0fe-b51eadec0d19',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09782f0a-e962-5d6a-a60d-799ac791b6a4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '844c1957-93fd-56df-909a-798f2917b536',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5c3a7e80-9c6f-5142-8bd6-1dab4d23038d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2ead9e25-b8ba-5dc6-bbe8-1f0327dfe46f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '83b0a25d-de47-5129-96ea-b056bf1d2c19',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd9c65ab0-c815-5e55-8c39-2be0339e7990',
                  type: 'epm-packages-assets',
                },
                {
                  id: '782dcf8c-2eee-542a-8b98-40b2d0c60fbb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f492a863-d71f-54bd-bbbc-1c640c794699',
                  type: 'epm-packages-assets',
                },
                {
                  id: '65fda65a-dd24-568c-b0d8-95eb1da93137',
                  type: 'epm-packages-assets',
                },
                {
                  id: '45c8eadb-19e7-5ac7-a432-f3ac44ba35cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e5da09f6-3e57-5795-a3aa-bc74fa800333',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e1a0aaa9-8cfb-536b-866d-96f054ed2ea7',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dbb328c3-e93f-5f33-97ab-3d7e691df818',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c2204072-4b1b-59e4-a390-eab957af67fb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c402923-b995-549e-90a3-ae112dc89c0d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'df392617-b554-5aac-a980-0bcc0cc6bc15',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5486b6f5-6952-5dea-ba57-a350c6cf951d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c27ae676-affc-570f-ba89-1690c5f17fc5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '727fa13f-3ce2-5192-a861-5b3de0e84edd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3cf1f6bf-b282-5072-8aca-9ebafbfc6b16',
                  type: 'epm-packages-assets',
                },
                {
                  id: '923ee008-55f6-51a1-95d7-f2bd5a7b05da',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b1834cca-2958-5c27-93a9-f53e87d429ec',
                  type: 'epm-packages-assets',
                },
                {
                  id: '602c5069-f300-5726-b181-d4ce5a67d976',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e76b30a0-c661-5bcb-9024-4ae2e51087cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: '425bd0bf-a2a0-525b-8764-12fc59081564',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd41f1cbc-7803-558d-9300-fa5c3401f2eb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '15b1b69b-b4eb-579b-9def-c654dc213052',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1db4fef3-e17a-5cdd-bd25-49f5e65a8c6c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a430d606-aef6-5284-8cbe-55e72e581f24',
                  type: 'epm-packages-assets',
                },
                {
                  id: '56554ff2-69e1-5eb5-815f-e6662ce9a70b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f0328d22-3b60-529e-b6fb-dcad250c1358',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ba6d7cd1-78e7-578e-b82c-c5ad2dad34aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '07dd07a6-381a-5615-b44b-c5771e5af17a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ae3f5fe2-055e-5a5d-baa1-2f91c854016e',
                  type: 'epm-packages-assets',
                },
                {
                  id: '456992e7-cb48-514e-9370-ff95ef1e4dc6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1ac0b2f9-a357-53aa-a5d2-b35ce090f16c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b2283d25-3935-5061-836c-5beb5ce23c1b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35e6fdfa-a4ba-5dcf-bf3f-ff472e2c6fda',
                  type: 'epm-packages-assets',
                },
                {
                  id: '071d9980-a001-5ec6-8b91-899696bb4c83',
                  type: 'epm-packages-assets',
                },
                {
                  id: '05f17419-b4e7-5543-acb5-35c4810ec301',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dc238334-77d8-54fd-97b5-0aa6b50dc15b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '63c9b90b-3506-5a2a-a8d7-25bee54c5642',
                  type: 'epm-packages-assets',
                },
                {
                  id: '61acbf67-050f-506f-8fff-d9893e963f21',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6b83cba9-eca4-51e9-8fac-d782892cdf52',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd989a2c5-6219-5d54-a234-5f71a0cf384f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '76a85a8e-2b90-52b9-920b-cd70d43f33d1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6e5a5a24-fe86-564e-8096-12b9fda3e3bb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3a3944cd-5413-5611-b0ea-8d64d911e763',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ee9a4369-8ecf-5cff-ab8a-6caeb55ae1ff',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3ee85b6e-c043-5d2a-b6ff-87c4dfb29e02',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'df45efd7-ec8c-5a0c-bbab-40dcf4af183c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5b4de166-a4f4-5c1f-940a-777676e49194',
                  type: 'epm-packages-assets',
                },
                {
                  id: '879018d5-c983-5171-95f0-d281091fd45c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '86fcf7bb-d363-58f3-a30e-0b0e7a567b5a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '664f70da-70fd-5ab0-ab15-f6bd412c4ec8',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c1300b66-1d00-5053-a217-0fa1905e0b50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0e502662-9005-5d7c-b33f-82f0aed11767',
                  type: 'epm-packages-assets',
                },
                {
                  id: '395b5024-8124-512f-8d3a-ab20d6f678c6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '482d8420-b2a6-5986-a63a-68994aa696b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5be1a44d-de60-5073-9ac3-ac1c806b2174',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b183f8f7-cc02-5aae-9f9e-93c967312fb5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9203d6b4-58bc-55f7-90a6-715c61978e00',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e62cd52b-8aa2-5478-948a-0af769cfa3f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8dd1b802-a8a1-549c-9882-5a387616278e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b62e071b-1330-5da7-93be-13f26b2490ce',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de32eec9-6826-5710-9871-ee5d3f05daf3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0461288e-4f7c-592b-8d6e-6d21b4005122',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd037eebb-5669-5346-96b9-07bf0aea5aa3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd992521e-3da2-5ef2-a9af-c81ae0daafd0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9237fa3c-7cee-5d0e-b8ab-e91f516bebf0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '419ed61e-79be-5b2a-830d-84b60ce399cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '75ddd649-12fd-5abe-b01c-9c0bb59cb599',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'eb101bca-21fc-590a-92ed-6356669871c5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2b8da506-442c-547e-889d-91ce1d06719a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b5246a9-c55f-508d-8131-171e18db4df1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9323106b-f76f-586d-bcce-ba79222539a8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '80cfbb1a-17b2-5560-9e01-222b0190413a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7ceeada4-9e86-59a6-92c5-00ad972a18fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '477f7a3a-1b7d-53fa-ae52-f878233a59e6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1dce55af-7048-57a0-9452-697aa86af619',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ced85372-ac57-5161-8447-a7fcb8fff146',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bcc5e2e4-58e7-5e11-9bbd-115ff8d152c4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a3a1942-3690-56b5-9fbe-814251242a7c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6da3f3a1-253c-58ef-8e7c-2f25bbe052cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd18811ee-dab9-5a7e-aa8c-a6612c9cf97e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'feb02a30-aee8-5b60-b82d-cfcc37ab5e33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '54269949-2d97-58c9-ac30-03a7d7fd17f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fb361929-6336-550b-8c49-f5d2985d5ca2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98c52f15-4177-500c-92e7-3a0d6f1cc929',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6cf5588f-9117-5db1-bfe4-18ac1b011a10',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5093daf6-13ce-5eb6-893b-0d177cd33e62',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd34132d6-1697-5133-929e-c7cc62cab031',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ec1c5fcb-41ed-5d7c-bcea-7012590b001d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f483f0a6-fb36-57d4-be8e-23ff3ad279cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: '04593bf8-d735-56f5-bc96-0b67c98bf950',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ab5299c8-8f21-5ddc-b413-288e46dcdf02',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a579c235-bb6d-5a49-9430-57a254a6542c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a8aed8cc-d807-5451-88cd-6b567f3694a6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5af174a8-3952-5923-b11f-375433bf29d6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4cb8fbb9-7ba8-5397-911b-48c6f1be7ecf',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1ebfa0f1-1b9c-505c-b1f4-b5ed344679c0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f177390-9379-5e80-9103-640475177768',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'be0a7876-e648-57d7-8762-0c7b8aed9242',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e57ea19f-a7cb-5476-a24a-f3832b42c5fd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0d7be804-70be-5f57-b498-0aa9d7491763',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a0838187-fd36-5914-884d-64d1098b9d6e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a6925653-2de4-53a6-95d6-e29dfeafe489',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0fa9f244-3919-5a86-8bd1-df68c24dc196',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cf67b6d6-90f8-5a8d-9bcc-ccb25f482f89',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ca76c39d-e335-528c-b1ef-31fc269d7e5f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a6480759-0753-53b0-8b56-ef7f697a16af',
                  type: 'epm-packages-assets',
                },
                {
                  id: '962c662d-8660-5631-8f17-5d14da9e353d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ea5c3b39-31b5-50f9-8bf3-398b47c1d196',
                  type: 'epm-packages-assets',
                },
                {
                  id: '42759e10-93ec-53c9-95cf-6a0a6091a96e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c7ad9b7c-00d6-51aa-94c5-1d74be48764a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2bc3ca32-343a-5740-8d24-14e683d75f33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b4366ab-f71a-59ae-8db8-1696c3b23b33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '47d641a9-f42c-57e8-96a6-f4054b22dca4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c824bc8-9b78-5748-946c-f69ac75fe3b4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3216321a-8a51-5f67-ab28-6d2532cf5919',
                  type: 'epm-packages-assets',
                },
                {
                  id: '248923ac-b469-5f23-bba3-a34017eb0151',
                  type: 'epm-packages-assets',
                },
                {
                  id: '771648e7-6c3c-5401-bcbf-b94a68a1ab89',
                  type: 'epm-packages-assets',
                },
                {
                  id: '524d5bc7-228d-525b-aba6-b6a9b7a47e0d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c46f811b-1272-5e60-b541-991d6488ed0b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e1152fc2-ff44-5aee-b50f-8f3392200ae6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cbfb9f7f-c2b0-5ad1-8142-186779d63d59',
                  type: 'epm-packages-assets',
                },
                {
                  id: '766355b9-e473-5b2e-b4c9-e6cfa6c606fb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8ac54866-3726-5bb7-bad9-38dc33fabe82',
                  type: 'epm-packages-assets',
                },
                {
                  id: '16ce8168-57ca-5917-bd4c-d691a048ad16',
                  type: 'epm-packages-assets',
                },
                {
                  id: '20cdcaf5-b230-50bf-a158-acad9fc5ec3f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fa20298e-f329-56d8-a90d-0bc4458d4ed6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b3c04a1f-21fc-5920-bb41-9b57f63ada84',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e3c01bc2-8b91-5237-8a11-a31c498cd83f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ab95d679-cc4c-5c98-9f31-43630048ca91',
                  type: 'epm-packages-assets',
                },
                {
                  id: '95912025-a6fd-50bc-89ab-214d13013a4d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9003167b-4635-5657-ad7d-1ad97a398dc9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3dd15282-74fd-5a9a-b885-aa0dba07cc66',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b7c2a529-1f58-5781-8560-74693ab845ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '19a34883-dcaf-59a6-ac26-3daec6076098',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ebcf8c0e-c666-568e-ab05-56a611c20875',
                  type: 'epm-packages-assets',
                },
                {
                  id: '33132e16-5251-5e5f-b3c7-bcf0e65d1cae',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0a26359a-55e4-5db4-abda-a5f3162ac7d2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9818891b-8944-5b04-849a-12c61ffbdfb5',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ee08d0de-f1c7-58bb-9609-3d91657a2778',
                  type: 'epm-packages-assets',
                },
                {
                  id: '51a6e576-0d80-57e4-a099-88bb372781a9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a3b7378e-d5c7-59a8-9a7e-cee7c0f8096c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e87628f-7f7b-5cbd-9a1b-98ff349b66aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a04ebe0-1cc0-5908-aee1-a8f35aff13f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a71bbec1-1bb1-5d85-aa16-5838c70f5d63',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fd15a96f-74fd-547a-9622-76a14936340d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '930af1aa-48ea-5cc3-866a-c615fc76c48b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3faeefc7-d1c9-52be-9ba5-f75b37f3551b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ba4741d3-49e3-5e26-8176-33c0be6da6de',
                  type: 'epm-packages-assets',
                },
                {
                  id: '621af1a9-fa73-5d2f-831b-ed4ef32f338a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b875346a-0191-582c-855a-8b82c767640b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a12e0cb6-5d29-5932-9223-6d8b49b0e65d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '58f95c77-ed95-5e5d-8412-e7ae37d82f80',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8d01fc4e-b10a-5802-814f-b80202548327',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e648e969-e0c7-50e1-a9c3-b8201d267d35',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f9c18e3-52c7-5d8e-94c8-e87122ad30de',
                  type: 'epm-packages-assets',
                },
                {
                  id: '106e06e5-a6fa-5e10-9ba7-b1146181e001',
                  type: 'epm-packages-assets',
                },
                {
                  id: '73f0c353-edb5-530f-9c4b-3b3f2488c66b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '87453afc-27f2-58a2-a633-84cf698070f7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09a768d3-79c8-5d6d-b50b-7b8118585774',
                  type: 'epm-packages-assets',
                },
                {
                  id: '449ce74a-6d50-5742-9d99-6e16e0453b41',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dddf7395-0979-54cd-b8cc-35d7d9091f95',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b6d765b9-18a5-5048-b801-fa9de6b7cfb2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '587bb82b-755a-5b14-8f91-7eb11ba3b5a9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9990dbfe-1c2e-5e4d-ad16-4ef360698b05',
                  type: 'epm-packages-assets',
                },
                {
                  id: '52f62db8-da37-56b1-b5a6-003992fb469a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b5dfa663-116c-5219-a797-b0aae4ef608b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9276f03e-434b-5deb-a3c9-5463bd846b77',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c92ec36-e5a8-5d2a-9b77-e19847ca962f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ead76df6-9380-55d8-ac8b-cbd3a74e9f23',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'faedf742-81cf-57e7-83ff-1e72df1da7f4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '88a58712-7e6a-50d2-97f3-4de63e89fa79',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1f546815-bcb9-5770-952e-7ea9cb89f9bd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bfc48dd6-2986-5398-8290-fc81842c52d9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd5efde78-da8b-59e0-8e1d-445658659ed0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '904899f7-c8d9-547c-afbc-e91f61338e26',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6d27d11c-e9fa-50fa-b26c-694f87e0b7b1',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c5ed7ee9-a54b-5f23-8696-d5b1c25b531f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4b7e8e94-0843-518e-b159-002c540f8b43',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f770c593-5207-5d92-8ef6-3c790e7e9eb0',
                  type: 'epm-packages-assets',
                },
              ],
              es_index_patterns: {
                findings: 'logs-cloud_security_posture.findings-*',
                vulnerabilities: 'logs-cloud_security_posture.vulnerabilities-*',
              },
              name: 'cloud_security_posture',
              version: '1.9.0-preview04',
              install_version: '1.9.0-preview04',
              install_status: 'installed',
              install_started_at: '2024-04-29T21:55:09.509Z',
              install_source: 'registry',
              install_format_schema_version: '1.2.0',
              keep_policies_up_to_date: true,
              verification_status: 'unknown',
              latest_install_failed_attempts: [],
              verification_key_id: null,
              experimental_data_stream_features: [],
            },
            references: [],
            managed: false,
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: '10.2.0',
          },
          installationInfo: {
            created_at: '2024-04-04T14:57:54.879Z',
            updated_at: '2024-04-29T21:55:18.196Z',
            namespaces: [],
            type: 'epm-packages',
            installed_kibana: [
              {
                id: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b',
                type: 'index-pattern',
              },
              {
                id: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c',
                type: 'csp-rule-template',
              },
              {
                id: '01629238-aea8-5737-a59b-45baf8dab404',
                type: 'csp-rule-template',
              },
              {
                id: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9',
                type: 'csp-rule-template',
              },
              {
                id: '02da047f-bc78-5565-86a0-e121850f76c0',
                type: 'csp-rule-template',
              },
              {
                id: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae',
                type: 'csp-rule-template',
              },
              {
                id: '05480064-f899-53e8-b8ad-34172b09b400',
                type: 'csp-rule-template',
              },
              {
                id: '05676b4e-3274-5984-9981-6aa1623c24ec',
                type: 'csp-rule-template',
              },
              {
                id: '05c4bd94-162d-53e8-b112-e617ce74f8f6',
                type: 'csp-rule-template',
              },
              {
                id: '05f0c324-5c11-576f-b7a2-35ebf66f084b',
                type: 'csp-rule-template',
              },
              {
                id: '06161f41-c17a-586f-b08e-c45ea5157da0',
                type: 'csp-rule-template',
              },
              {
                id: '06635c87-1e11-59c3-9eba-b4d8a08ba899',
                type: 'csp-rule-template',
              },
              {
                id: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce',
                type: 'csp-rule-template',
              },
              {
                id: '08d850ca-c1be-57e2-ac39-5e38f8750cf6',
                type: 'csp-rule-template',
              },
              {
                id: '090923c7-e599-572b-bad3-703f768c262a',
                type: 'csp-rule-template',
              },
              {
                id: '0bdfe13d-7bc8-5415-8517-65114d344798',
                type: 'csp-rule-template',
              },
              {
                id: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861',
                type: 'csp-rule-template',
              },
              {
                id: '0e318770-7077-5996-afd8-27ca34fc5446',
                type: 'csp-rule-template',
              },
              {
                id: '1054ef6c-8f47-5d20-a922-8df0ac93acfa',
                type: 'csp-rule-template',
              },
              {
                id: '129b07b7-4470-5224-8246-6ae975d6304b',
                type: 'csp-rule-template',
              },
              {
                id: '1316108c-33a8-5198-9529-45716c5a87b1',
                type: 'csp-rule-template',
              },
              {
                id: '151312c8-7e97-5420-ac05-5a916b3c1feb',
                type: 'csp-rule-template',
              },
              {
                id: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d',
                type: 'csp-rule-template',
              },
              {
                id: '1706a986-39d7-5900-93eb-f191f6a40892',
                type: 'csp-rule-template',
              },
              {
                id: '17282e92-075f-593d-99eb-99346e4288ed',
                type: 'csp-rule-template',
              },
              {
                id: '1915b785-942d-5613-9a24-b40394ef745f',
                type: 'csp-rule-template',
              },
              {
                id: '1a8ee966-458a-5ff9-a6e9-436aba157ebd',
                type: 'csp-rule-template',
              },
              {
                id: '1b112bf6-61ad-5b08-888b-7b6c86b3526c',
                type: 'csp-rule-template',
              },
              {
                id: '1b89acc6-978c-57c3-b319-680e5251d6f6',
                type: 'csp-rule-template',
              },
              {
                id: '1d0a20ee-ad20-5416-84c8-32c0f69b209b',
                type: 'csp-rule-template',
              },
              {
                id: '1d6ff20d-4803-574b-80d2-e47031d9baa2',
                type: 'csp-rule-template',
              },
              {
                id: '1e180f0d-3419-5681-838b-9247927eb0f6',
                type: 'csp-rule-template',
              },
              {
                id: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4',
                type: 'csp-rule-template',
              },
              {
                id: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36',
                type: 'csp-rule-template',
              },
              {
                id: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37',
                type: 'csp-rule-template',
              },
              {
                id: '213e2b33-f2b1-575b-8753-f239b278c25a',
                type: 'csp-rule-template',
              },
              {
                id: '23941040-0aae-5afd-bc8d-793742133647',
                type: 'csp-rule-template',
              },
              {
                id: '23e5f81e-ca05-53bf-8109-7e676feecee3',
                type: 'csp-rule-template',
              },
              {
                id: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9',
                type: 'csp-rule-template',
              },
              {
                id: '26ff6dff-042f-5901-8191-0e347d113e9e',
                type: 'csp-rule-template',
              },
              {
                id: '27896f4b-0405-5388-bacd-182e77556711',
                type: 'csp-rule-template',
              },
              {
                id: '27acd88e-c64f-5e9e-9cff-2de649f92ccf',
                type: 'csp-rule-template',
              },
              {
                id: '28f96eda-c94e-597c-aef0-0bceee085540',
                type: 'csp-rule-template',
              },
              {
                id: '29cefccd-77fe-5428-8bea-3fc1390d5d1e',
                type: 'csp-rule-template',
              },
              {
                id: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc',
                type: 'csp-rule-template',
              },
              {
                id: '2d0044e3-d235-5703-9c16-729932a0131e',
                type: 'csp-rule-template',
              },
              {
                id: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f',
                type: 'csp-rule-template',
              },
              {
                id: '328a73c3-011d-5827-ae86-4e323739e4e1',
                type: 'csp-rule-template',
              },
              {
                id: '33299b3d-68da-5604-8c62-62690fd40c49',
                type: 'csp-rule-template',
              },
              {
                id: '33a612ed-8dee-554d-9dd7-857bfc31a33a',
                type: 'csp-rule-template',
              },
              {
                id: '34a4790c-0214-5eec-b97d-1c11ffa6861e',
                type: 'csp-rule-template',
              },
              {
                id: '34b16c08-cf25-5f0d-afed-98f75b5513de',
                type: 'csp-rule-template',
              },
              {
                id: '34c9c662-5072-5195-835e-48da9be5047f',
                type: 'csp-rule-template',
              },
              {
                id: '368b52f8-b468-5fc7-9e47-b1b5e040e051',
                type: 'csp-rule-template',
              },
              {
                id: '374309b1-b87a-58bd-b795-1067d2e8ee9f',
                type: 'csp-rule-template',
              },
              {
                id: '3760ac17-de0b-537d-8e74-455d132d19d2',
                type: 'csp-rule-template',
              },
              {
                id: '37fc1edc-a59d-5e63-a530-d3d088195865',
                type: 'csp-rule-template',
              },
              {
                id: '3851b212-b300-545d-8d6b-54ef71c86661',
                type: 'csp-rule-template',
              },
              {
                id: '38535c6f-a478-5cbb-82de-9417a3968bd6',
                type: 'csp-rule-template',
              },
              {
                id: '394963fa-63fd-5e81-82eb-ea1b8dfacd53',
                type: 'csp-rule-template',
              },
              {
                id: '3afddcd1-b745-5b3c-8623-ce4abe6878b5',
                type: 'csp-rule-template',
              },
              {
                id: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c',
                type: 'csp-rule-template',
              },
              {
                id: '3cd971cb-cf64-51ef-875b-9a7787cd97cb',
                type: 'csp-rule-template',
              },
              {
                id: '3d701761-f9b6-5c2d-ab99-928161d2ebbd',
                type: 'csp-rule-template',
              },
              {
                id: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca',
                type: 'csp-rule-template',
              },
              {
                id: '3ef4430e-2829-576a-a813-edc766625ea9',
                type: 'csp-rule-template',
              },
              {
                id: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e',
                type: 'csp-rule-template',
              },
              {
                id: '40ab36e3-7438-5c36-afcd-bf5f5401366e',
                type: 'csp-rule-template',
              },
              {
                id: '421191d6-a13c-5c78-8c5b-102e1229655f',
                type: 'csp-rule-template',
              },
              {
                id: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c',
                type: 'csp-rule-template',
              },
              {
                id: '43d5538c-17a3-5e04-9c06-ad4323bfd188',
                type: 'csp-rule-template',
              },
              {
                id: '449bf7bf-8070-580f-a3aa-66bc7f94a721',
                type: 'csp-rule-template',
              },
              {
                id: '461c5ca2-0173-5b8c-ae36-b229cffefbb2',
                type: 'csp-rule-template',
              },
              {
                id: '47ee9344-791e-50e4-a266-ee2ebce093a7',
                type: 'csp-rule-template',
              },
              {
                id: '4931d684-a386-5545-b2c4-47b836e0149b',
                type: 'csp-rule-template',
              },
              {
                id: '49c71814-2dbe-5204-ad07-879a80503fbc',
                type: 'csp-rule-template',
              },
              {
                id: '49fe9df5-e86f-5981-ac24-dcaadadc2790',
                type: 'csp-rule-template',
              },
              {
                id: '4a130791-cdb3-5524-b45d-1f3df79e2452',
                type: 'csp-rule-template',
              },
              {
                id: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5',
                type: 'csp-rule-template',
              },
              {
                id: '4b11956d-7985-524e-900e-20405e2baaca',
                type: 'csp-rule-template',
              },
              {
                id: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45',
                type: 'csp-rule-template',
              },
              {
                id: '4cfe4df4-4157-53bb-820f-278fe02ec960',
                type: 'csp-rule-template',
              },
              {
                id: '4d0a1c5a-27b5-5429-895d-e90878fcce1d',
                type: 'csp-rule-template',
              },
              {
                id: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8',
                type: 'csp-rule-template',
              },
              {
                id: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1',
                type: 'csp-rule-template',
              },
              {
                id: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35',
                type: 'csp-rule-template',
              },
              {
                id: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc',
                type: 'csp-rule-template',
              },
              {
                id: '50da62ee-4099-5950-ba1e-984794749f28',
                type: 'csp-rule-template',
              },
              {
                id: '5133d843-d913-5c1c-930f-89560b828704',
                type: 'csp-rule-template',
              },
              {
                id: '5382994d-59e0-54d9-a32b-dd860c467813',
                type: 'csp-rule-template',
              },
              {
                id: '5411a1e9-a529-5512-b556-93178e544c9e',
                type: 'csp-rule-template',
              },
              {
                id: '551d3a0b-36f6-51c6-ba8b-0a83926b1864',
                type: 'csp-rule-template',
              },
              {
                id: '551e7bcf-b231-500d-a193-d0a98163a680',
                type: 'csp-rule-template',
              },
              {
                id: '555cf8d5-f963-5574-a856-e06614cf9341',
                type: 'csp-rule-template',
              },
              {
                id: '5cdc703f-54ea-5de6-97c4-9fdb495725ef',
                type: 'csp-rule-template',
              },
              {
                id: '5d7e7fce-64fb-5b7b-beeb-920496c2e333',
                type: 'csp-rule-template',
              },
              {
                id: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0',
                type: 'csp-rule-template',
              },
              {
                id: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f',
                type: 'csp-rule-template',
              },
              {
                id: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9',
                type: 'csp-rule-template',
              },
              {
                id: '5ee4897d-808b-5ad6-877b-a276f8e65076',
                type: 'csp-rule-template',
              },
              {
                id: '5ee69b99-8f70-5daf-b784-866131aca3ba',
                type: 'csp-rule-template',
              },
              {
                id: '61ab077c-fc0f-5920-8bcf-ccc037a4139b',
                type: 'csp-rule-template',
              },
              {
                id: '62b717ac-bb8f-5274-a99f-5806dc4427a5',
                type: 'csp-rule-template',
              },
              {
                id: '64d37675-473f-5edc-882e-5b8b85b789c3',
                type: 'csp-rule-template',
              },
              {
                id: '64feecfc-7166-5d77-b830-bf4a8dd2e05d',
                type: 'csp-rule-template',
              },
              {
                id: '6588bb48-d02b-5169-a013-fe4dc115c709',
                type: 'csp-rule-template',
              },
              {
                id: '668cee84-c115-5166-a422-05c4d3e88c2c',
                type: 'csp-rule-template',
              },
              {
                id: '66cd0518-cfa3-5917-a399-a7dfde4e19db',
                type: 'csp-rule-template',
              },
              {
                id: '66cdd4cc-5870-50e1-959c-91443716b87a',
                type: 'csp-rule-template',
              },
              {
                id: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13',
                type: 'csp-rule-template',
              },
              {
                id: '67909c46-649c-52c1-a464-b3e81615d938',
                type: 'csp-rule-template',
              },
              {
                id: '68cfd04b-fc79-5877-8638-af3aa82d92db',
                type: 'csp-rule-template',
              },
              {
                id: '68f9d23f-882f-55d1-86c6-711413c31129',
                type: 'csp-rule-template',
              },
              {
                id: '69ffe7f6-bc09-5019-ba77-a2f81169e9de',
                type: 'csp-rule-template',
              },
              {
                id: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d',
                type: 'csp-rule-template',
              },
              {
                id: '6d58f558-d07a-541c-b720-689459524679',
                type: 'csp-rule-template',
              },
              {
                id: '6de73498-23d7-537f-83f3-08c660217e7e',
                type: 'csp-rule-template',
              },
              {
                id: '6e339632-0d1c-5a7c-8ca3-fac5813932d9',
                type: 'csp-rule-template',
              },
              {
                id: '6e46620d-cf63-55f9-b025-01889df276fd',
                type: 'csp-rule-template',
              },
              {
                id: '6e6481f1-5ede-552b-84e5-cceed281052a',
                type: 'csp-rule-template',
              },
              {
                id: '70f92ed3-5659-5c95-a8f8-a63211c57635',
                type: 'csp-rule-template',
              },
              {
                id: '71cd1aed-48f7-5490-a63d-e22436549822',
                type: 'csp-rule-template',
              },
              {
                id: '72bb12e0-31c0-54f4-a409-4aace3b602be',
                type: 'csp-rule-template',
              },
              {
                id: '737dc646-1c66-5fb6-8fcd-1aac6402532d',
                type: 'csp-rule-template',
              },
              {
                id: '741aa940-22a7-5015-95d5-f94b331d774e',
                type: 'csp-rule-template',
              },
              {
                id: '756e1a54-b2ce-56b9-a13f-17f652d7767c',
                type: 'csp-rule-template',
              },
              {
                id: '76be4dd2-a77a-5981-a893-db6770b35911',
                type: 'csp-rule-template',
              },
              {
                id: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100',
                type: 'csp-rule-template',
              },
              {
                id: '77d274cb-69ae-5a85-b8f6-ba192aee8af4',
                type: 'csp-rule-template',
              },
              {
                id: '7a2ab526-3440-5a0f-804c-c5eea8158053',
                type: 'csp-rule-template',
              },
              {
                id: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be',
                type: 'csp-rule-template',
              },
              {
                id: '7c908585-ec93-52dc-81bb-ceb17cd4c313',
                type: 'csp-rule-template',
              },
              {
                id: '7d1de53a-a32e-55c0-b412-317ed91f65e0',
                type: 'csp-rule-template',
              },
              {
                id: '7e584486-4d0f-5edb-8a64-7ee0b59333b8',
                type: 'csp-rule-template',
              },
              {
                id: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179',
                type: 'csp-rule-template',
              },
              {
                id: '80db9189-cd4d-572a-94dc-e635ee8af7fa',
                type: 'csp-rule-template',
              },
              {
                id: '81554879-3338-5208-9db3-efb2a549d38c',
                type: 'csp-rule-template',
              },
              {
                id: '8233dcc7-c6af-5110-b7d4-239a70d7bed5',
                type: 'csp-rule-template',
              },
              {
                id: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4',
                type: 'csp-rule-template',
              },
              {
                id: '84862c2c-4aba-5458-9c5f-12855091617b',
                type: 'csp-rule-template',
              },
              {
                id: '84b8b7be-d917-50f3-beab-c076d0098d83',
                type: 'csp-rule-template',
              },
              {
                id: '84c7925a-42ff-5999-b784-ab037f6242c6',
                type: 'csp-rule-template',
              },
              {
                id: '873e6387-218d-587a-8fa1-3d65f4a77802',
                type: 'csp-rule-template',
              },
              {
                id: '875c1196-b6c7-5bc9-b255-e052853c3d08',
                type: 'csp-rule-template',
              },
              {
                id: '87952b8d-f537-5f8a-b57b-63a31b031170',
                type: 'csp-rule-template',
              },
              {
                id: '882ffc80-73e9-56aa-ae72-73b39af6702f',
                type: 'csp-rule-template',
              },
              {
                id: '88634421-e47c-59fb-9466-a86023f20dd5',
                type: 'csp-rule-template',
              },
              {
                id: '88734e31-d055-58ba-bf70-7d40d0b4e707',
                type: 'csp-rule-template',
              },
              {
                id: '89a294ae-d736-51ca-99d4-0ea4782caed0',
                type: 'csp-rule-template',
              },
              {
                id: '89b58088-54f6-55dc-96a3-f08ac4b27ea3',
                type: 'csp-rule-template',
              },
              {
                id: '89cc8ff0-be81-55f2-b1cf-d7db1e214741',
                type: 'csp-rule-template',
              },
              {
                id: '89ebec6b-3cc4-5898-a3b9-534174f93051',
                type: 'csp-rule-template',
              },
              {
                id: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a',
                type: 'csp-rule-template',
              },
              {
                id: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2',
                type: 'csp-rule-template',
              },
              {
                id: '8d3f2919-da46-5502-b48b-9ba41d03281b',
                type: 'csp-rule-template',
              },
              {
                id: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75',
                type: 'csp-rule-template',
              },
              {
                id: '8f2644ed-70b5-576f-b9b9-aabea6821749',
                type: 'csp-rule-template',
              },
              {
                id: '8f88e7f7-6924-5913-bc18-95fcdc5ae744',
                type: 'csp-rule-template',
              },
              {
                id: '900567f0-4c2f-543a-b5cf-d11223a772a2',
                type: 'csp-rule-template',
              },
              {
                id: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3',
                type: 'csp-rule-template',
              },
              {
                id: '9126cd85-611c-5b06-b2f2-a18338e26ae1',
                type: 'csp-rule-template',
              },
              {
                id: '919ef7a7-126c-517e-aa35-fb251b1ad587',
                type: 'csp-rule-template',
              },
              {
                id: '91d52d43-da61-5ba2-a4d4-1018fee84559',
                type: 'csp-rule-template',
              },
              {
                id: '92077c86-0322-5497-b94e-38ef356eadd6',
                type: 'csp-rule-template',
              },
              {
                id: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d',
                type: 'csp-rule-template',
              },
              {
                id: '9259a915-0294-54d6-b379-162ceb36e875',
                type: 'csp-rule-template',
              },
              {
                id: '9272d2b5-4e25-5658-8a6c-d917f60134ec',
                type: 'csp-rule-template',
              },
              {
                id: '92ab0102-d825-52ce-87a8-1d0b4e06166c',
                type: 'csp-rule-template',
              },
              {
                id: '933268ec-44e8-5fba-9ed7-535804521cc7',
                type: 'csp-rule-template',
              },
              {
                id: '934583bd-306a-51d9-a730-020bd45f7f01',
                type: 'csp-rule-template',
              },
              {
                id: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c',
                type: 'csp-rule-template',
              },
              {
                id: '93808f1f-f05e-5e48-b130-5527795e6158',
                type: 'csp-rule-template',
              },
              {
                id: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e',
                type: 'csp-rule-template',
              },
              {
                id: '94fb43f8-90da-5089-b503-66a04faa2630',
                type: 'csp-rule-template',
              },
              {
                id: '94fbdc26-aa6f-52e6-9277-094174c46e29',
                type: 'csp-rule-template',
              },
              {
                id: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b',
                type: 'csp-rule-template',
              },
              {
                id: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a',
                type: 'csp-rule-template',
              },
              {
                id: '9718b528-8327-5eef-ad21-c8bed5532429',
                type: 'csp-rule-template',
              },
              {
                id: '97504079-0d62-5d0a-9939-17b57b444547',
                type: 'csp-rule-template',
              },
              {
                id: '9a0d57ac-a54d-5652-bf07-982d542bf296',
                type: 'csp-rule-template',
              },
              {
                id: '9a9d808f-61a9-55b7-a487-9d50fd2983c5',
                type: 'csp-rule-template',
              },
              {
                id: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb',
                type: 'csp-rule-template',
              },
              {
                id: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f',
                type: 'csp-rule-template',
              },
              {
                id: '9c2d1c63-7bf3-584d-b87a-043853dad7a4',
                type: 'csp-rule-template',
              },
              {
                id: '9ce2276b-db96-5aad-9329-08ce874c5db6',
                type: 'csp-rule-template',
              },
              {
                id: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b',
                type: 'csp-rule-template',
              },
              {
                id: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852',
                type: 'csp-rule-template',
              },
              {
                id: '9fb9a46f-de59-580b-938e-829090bd3975',
                type: 'csp-rule-template',
              },
              {
                id: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b',
                type: 'csp-rule-template',
              },
              {
                id: '9fcbc87c-0963-58ba-8e21-87e22b80fc27',
                type: 'csp-rule-template',
              },
              {
                id: 'a1f327c0-3e4b-5b55-891a-b91e720cd535',
                type: 'csp-rule-template',
              },
              {
                id: 'a22a5431-1471-534c-8e7c-1e16fe0a857c',
                type: 'csp-rule-template',
              },
              {
                id: 'a2447c19-a799-5270-9e03-ac322c2396d5',
                type: 'csp-rule-template',
              },
              {
                id: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3',
                type: 'csp-rule-template',
              },
              {
                id: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d',
                type: 'csp-rule-template',
              },
              {
                id: 'a501efd2-73b9-5f92-a2c7-fa03ae753140',
                type: 'csp-rule-template',
              },
              {
                id: 'a52c1d16-d925-545d-bbd9-4257c2485eea',
                type: 'csp-rule-template',
              },
              {
                id: 'a6074b1d-e115-5416-bdc5-6e1940effd09',
                type: 'csp-rule-template',
              },
              {
                id: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5',
                type: 'csp-rule-template',
              },
              {
                id: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f',
                type: 'csp-rule-template',
              },
              {
                id: 'a7c6b368-29db-53e6-8b86-dfaddf719f59',
                type: 'csp-rule-template',
              },
              {
                id: 'a97eb244-d583-528c-a49a-17b0aa14decd',
                type: 'csp-rule-template',
              },
              {
                id: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba',
                type: 'csp-rule-template',
              },
              {
                id: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11',
                type: 'csp-rule-template',
              },
              {
                id: 'aa4374f0-adab-580c-ac9d-907fd2783219',
                type: 'csp-rule-template',
              },
              {
                id: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b',
                type: 'csp-rule-template',
              },
              {
                id: 'abc6f4b4-3add-57c4-973d-c678df60804c',
                type: 'csp-rule-template',
              },
              {
                id: 'ad4de26d-02a8-5202-b718-48147bf0fd03',
                type: 'csp-rule-template',
              },
              {
                id: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b',
                type: 'csp-rule-template',
              },
              {
                id: 'b0a70444-c719-5772-a8c1-2cd72578f8ee',
                type: 'csp-rule-template',
              },
              {
                id: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506',
                type: 'csp-rule-template',
              },
              {
                id: 'b190337a-56a7-5906-8960-76fd05283599',
                type: 'csp-rule-template',
              },
              {
                id: 'b1b40df2-f562-564a-9d43-94774e1698d1',
                type: 'csp-rule-template',
              },
              {
                id: 'b287617d-7623-5d72-923d-e79b1301e06c',
                type: 'csp-rule-template',
              },
              {
                id: 'b2909440-5ad0-522e-8db0-9439d573b7d5',
                type: 'csp-rule-template',
              },
              {
                id: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e',
                type: 'csp-rule-template',
              },
              {
                id: 'b4133ca4-32f1-501e-ad0a-a22700208a4f',
                type: 'csp-rule-template',
              },
              {
                id: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc',
                type: 'csp-rule-template',
              },
              {
                id: 'b449135c-8747-58fe-9d46-218728745520',
                type: 'csp-rule-template',
              },
              {
                id: 'b5493b70-e25f-54e6-9931-36138c33f775',
                type: 'csp-rule-template',
              },
              {
                id: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2',
                type: 'csp-rule-template',
              },
              {
                id: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a',
                type: 'csp-rule-template',
              },
              {
                id: 'b64386ab-20fa-57d2-9b5b-631d64181531',
                type: 'csp-rule-template',
              },
              {
                id: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b',
                type: 'csp-rule-template',
              },
              {
                id: 'b794635d-a338-5b4e-bfa0-75257e854c6a',
                type: 'csp-rule-template',
              },
              {
                id: 'b8c40039-034b-5299-8660-a7c8d34efe36',
                type: 'csp-rule-template',
              },
              {
                id: 'b8f1182a-1b3e-5b08-8482-f74949163e97',
                type: 'csp-rule-template',
              },
              {
                id: 'b96194c6-8eb7-5835-852d-47b84db83697',
                type: 'csp-rule-template',
              },
              {
                id: 'ba545cc3-f447-5d14-8841-d3d3c05024e8',
                type: 'csp-rule-template',
              },
              {
                id: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684',
                type: 'csp-rule-template',
              },
              {
                id: 'bb264405-de3e-5b91-9654-2056f905fc67',
                type: 'csp-rule-template',
              },
              {
                id: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf',
                type: 'csp-rule-template',
              },
              {
                id: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961',
                type: 'csp-rule-template',
              },
              {
                id: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e',
                type: 'csp-rule-template',
              },
              {
                id: 'be1197db-90d0-58db-b780-f0a939264bd0',
                type: 'csp-rule-template',
              },
              {
                id: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b',
                type: 'csp-rule-template',
              },
              {
                id: 'c0ef1e12-b201-5736-8475-4b62978084e8',
                type: 'csp-rule-template',
              },
              {
                id: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628',
                type: 'csp-rule-template',
              },
              {
                id: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf',
                type: 'csp-rule-template',
              },
              {
                id: 'c1e1ca12-c0e2-543e-819d-22249927d241',
                type: 'csp-rule-template',
              },
              {
                id: 'c28e606d-f6a7-58b2-820f-e2fb702bf956',
                type: 'csp-rule-template',
              },
              {
                id: 'c2b36f84-34b5-57fd-b9b0-f225be981497',
                type: 'csp-rule-template',
              },
              {
                id: 'c2d65e60-221b-5748-a545-579a69ad4a93',
                type: 'csp-rule-template',
              },
              {
                id: 'c40bebb5-5403-59d8-b960-00d6946931ce',
                type: 'csp-rule-template',
              },
              {
                id: 'c43a57db-5248-5855-a613-2a05d0a42768',
                type: 'csp-rule-template',
              },
              {
                id: 'c444d9e3-d3de-5598-90e7-95a922b51664',
                type: 'csp-rule-template',
              },
              {
                id: 'c455dba0-a768-5c76-8509-3484ec33102f',
                type: 'csp-rule-template',
              },
              {
                id: 'c52e86bd-55f1-5c6a-8349-918f97963346',
                type: 'csp-rule-template',
              },
              {
                id: 'c53dab24-a23f-53c6-8d36-f64cc03ab277',
                type: 'csp-rule-template',
              },
              {
                id: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4',
                type: 'csp-rule-template',
              },
              {
                id: 'c8a8f827-fba6-58ee-80b8-e64a605a4902',
                type: 'csp-rule-template',
              },
              {
                id: 'c8f24be5-fd7d-510f-ab93-2440bb826750',
                type: 'csp-rule-template',
              },
              {
                id: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9',
                type: 'csp-rule-template',
              },
              {
                id: 'cb57543f-5435-55b5-97cf-bda29ec9094a',
                type: 'csp-rule-template',
              },
              {
                id: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72',
                type: 'csp-rule-template',
              },
              {
                id: 'cda5f949-378c-5ef6-a65e-47187af983e4',
                type: 'csp-rule-template',
              },
              {
                id: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e',
                type: 'csp-rule-template',
              },
              {
                id: 'd1d73385-2909-598a-acf7-bf1d8130f314',
                type: 'csp-rule-template',
              },
              {
                id: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c',
                type: 'csp-rule-template',
              },
              {
                id: 'd248e880-7d96-5559-a25c-0f56c289a2e7',
                type: 'csp-rule-template',
              },
              {
                id: 'd303c4f1-489c-56ca-add9-29820c2214af',
                type: 'csp-rule-template',
              },
              {
                id: 'd3d725bd-652f-573e-97f5-adfd002fab8e',
                type: 'csp-rule-template',
              },
              {
                id: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6',
                type: 'csp-rule-template',
              },
              {
                id: 'd498d11f-6c2a-5593-b6c6-6960b28da84e',
                type: 'csp-rule-template',
              },
              {
                id: 'd57d6506-a519-5a29-a816-b1204ebfef21',
                type: 'csp-rule-template',
              },
              {
                id: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846',
                type: 'csp-rule-template',
              },
              {
                id: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a',
                type: 'csp-rule-template',
              },
              {
                id: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c',
                type: 'csp-rule-template',
              },
              {
                id: 'dafb527b-9869-5062-8d38-c9dced4a27c2',
                type: 'csp-rule-template',
              },
              {
                id: 'db28165f-6f7c-5450-b9f3-61c7b897d833',
                type: 'csp-rule-template',
              },
              {
                id: 'db58a1e4-de58-5899-bee8-f6ced89d6f80',
                type: 'csp-rule-template',
              },
              {
                id: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48',
                type: 'csp-rule-template',
              },
              {
                id: 'dfc17731-aa8f-5ecc-878b-113d1db009ca',
                type: 'csp-rule-template',
              },
              {
                id: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40',
                type: 'csp-rule-template',
              },
              {
                id: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd',
                type: 'csp-rule-template',
              },
              {
                id: 'e073f962-74d9-585b-ae5a-e37c461e9b7c',
                type: 'csp-rule-template',
              },
              {
                id: 'e1b73c05-5137-5b65-9513-6f8018b6deff',
                type: 'csp-rule-template',
              },
              {
                id: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f',
                type: 'csp-rule-template',
              },
              {
                id: 'e2306922-4f95-5660-bf2e-9610f556de69',
                type: 'csp-rule-template',
              },
              {
                id: 'e24bf247-bfdc-5bbf-9813-165b905b52e6',
                type: 'csp-rule-template',
              },
              {
                id: 'e3c6b85b-703e-5891-a01f-640d59ec449e',
                type: 'csp-rule-template',
              },
              {
                id: 'e570dc22-4f5d-51db-a193-983cb7d20afe',
                type: 'csp-rule-template',
              },
              {
                id: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71',
                type: 'csp-rule-template',
              },
              {
                id: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab',
                type: 'csp-rule-template',
              },
              {
                id: 'e92ddce9-3cba-5e3d-adac-53df0350eca0',
                type: 'csp-rule-template',
              },
              {
                id: 'ea3378aa-250e-50d8-9260-ff8237cf09a2',
                type: 'csp-rule-template',
              },
              {
                id: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e',
                type: 'csp-rule-template',
              },
              {
                id: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f',
                type: 'csp-rule-template',
              },
              {
                id: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156',
                type: 'csp-rule-template',
              },
              {
                id: 'eda32e5d-3684-5205-b3a4-bbddacddc60f',
                type: 'csp-rule-template',
              },
              {
                id: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff',
                type: 'csp-rule-template',
              },
              {
                id: 'ede1488a-e8cd-5d5f-a25d-96c136695594',
                type: 'csp-rule-template',
              },
              {
                id: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce',
                type: 'csp-rule-template',
              },
              {
                id: 'eeb00e89-7125-58e8-9248-b9f429583277',
                type: 'csp-rule-template',
              },
              {
                id: 'eed3e284-5030-56db-b749-01d7120dc577',
                type: 'csp-rule-template',
              },
              {
                id: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005',
                type: 'csp-rule-template',
              },
              {
                id: 'efec59bf-4563-5da7-a1db-f5c28e93b21f',
                type: 'csp-rule-template',
              },
              {
                id: 'f00c266c-0e28-5c49-b2b0-cd97603341ec',
                type: 'csp-rule-template',
              },
              {
                id: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22',
                type: 'csp-rule-template',
              },
              {
                id: 'f44d0940-2e62-5993-9028-d3e63ae23960',
                type: 'csp-rule-template',
              },
              {
                id: 'f507bb23-1a9d-55dd-8edc-19a33e64d646',
                type: 'csp-rule-template',
              },
              {
                id: 'f512a987-4f86-5fb3-b202-6b5de22a739f',
                type: 'csp-rule-template',
              },
              {
                id: 'f55af438-f955-51d3-b42f-60b0d48d86e4',
                type: 'csp-rule-template',
              },
              {
                id: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3',
                type: 'csp-rule-template',
              },
              {
                id: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda',
                type: 'csp-rule-template',
              },
              {
                id: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579',
                type: 'csp-rule-template',
              },
              {
                id: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2',
                type: 'csp-rule-template',
              },
              {
                id: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6',
                type: 'csp-rule-template',
              },
              {
                id: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694',
                type: 'csp-rule-template',
              },
              {
                id: 'f9344da7-b640-5587-98b8-9d9066000883',
                type: 'csp-rule-template',
              },
              {
                id: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06',
                type: 'csp-rule-template',
              },
              {
                id: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7',
                type: 'csp-rule-template',
              },
              {
                id: 'fb4368ab-cdee-5188-814c-a8197411ba22',
                type: 'csp-rule-template',
              },
              {
                id: 'fb8759d0-8564-572c-9042-d395b7e0b74d',
                type: 'csp-rule-template',
              },
              {
                id: 'fcc4b1b4-13e6-5908-be80-7ed36211de90',
                type: 'csp-rule-template',
              },
              {
                id: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b',
                type: 'csp-rule-template',
              },
              {
                id: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4',
                type: 'csp-rule-template',
              },
              {
                id: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4',
                type: 'csp-rule-template',
              },
              {
                id: 'fe083488-fa0f-5408-9624-ac27607ac2ff',
                type: 'csp-rule-template',
              },
              {
                id: 'fe219241-4b9c-585f-b982-bb248852baa1',
                type: 'csp-rule-template',
              },
              {
                id: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077',
                type: 'csp-rule-template',
              },
              {
                id: 'ffc9fb91-dc44-512b-a558-036e8ce11282',
                type: 'csp-rule-template',
              },
            ],
            installed_kibana_space_id: 'default',
            installed_es: [
              {
                id: 'logs-cloud_security_posture.findings-default_policy',
                type: 'data_stream_ilm_policy',
              },
              {
                id: 'logs-cloud_security_posture.findings-1.9.0-preview04',
                type: 'ingest_pipeline',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities-1.9.0-preview04',
                type: 'ingest_pipeline',
              },
              {
                id: 'logs-cloud_security_posture.findings',
                type: 'index_template',
              },
              {
                id: 'logs-cloud_security_posture.findings@package',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.findings@custom',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities',
                type: 'index_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities@package',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities@custom',
                type: 'component_template',
              },
            ],
            install_status: 'installed',
            install_source: 'registry',
            name: 'cloud_security_posture',
            version: '1.9.0-preview04',
            verification_status: 'unknown',
            verification_key_id: null,
            experimental_data_stream_features: [],
            latest_install_failed_attempts: [],
          },
        },
        response: {
          name: 'cloud_security_posture',
          title: 'Security Posture Management',
          version: '1.9.0-preview04',
          release: 'beta',
          source: {
            license: 'Elastic-2.0',
          },
          description: 'Identify & remediate configuration risks in your Cloud infrastructure',
          type: 'integration',
          download: '/epr/cloud_security_posture/cloud_security_posture-1.9.0-preview04.zip',
          path: '/package/cloud_security_posture/1.9.0-preview04',
          icons: [
            {
              src: '/img/logo_cloud_security_posture.svg',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_cloud_security_posture.svg',
              title: 'Cloud Security Posture logo',
              size: '32x32',
              type: 'image/svg+xml',
            },
          ],
          conditions: {
            kibana: {
              version: '^8.14.0',
            },
            elastic: {
              subscription: 'basic',
              capabilities: ['security'],
            },
          },
          owner: {
            type: 'elastic',
            github: 'elastic/cloud-security-posture',
          },
          categories: ['security', 'cloudsecurity_cdr'],
          signature_path:
            '/epr/cloud_security_posture/cloud_security_posture-1.9.0-preview04.zip.sig',
          format_version: '3.0.0',
          readme: '/package/cloud_security_posture/1.9.0-preview04/docs/README.md',
          license: 'basic',
          screenshots: [
            {
              src: '/img/dashboard.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/dashboard.png',
              title: 'Dashboard page',
              size: '1293x718',
              type: 'image/png',
            },
            {
              src: '/img/findings.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/findings.png',
              title: 'Findings page',
              size: '3134x1740',
              type: 'image/png',
            },
            {
              src: '/img/findings-flyout.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/findings-flyout.png',
              title: 'Detailed view of a single finding',
              size: '3176x1748',
              type: 'image/png',
            },
            {
              src: '/img/benchmarks.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/benchmarks.png',
              title: 'Benchmarks page',
              size: '3168x1752',
              type: 'image/png',
            },
            {
              src: '/img/rules.png',
              path: '/package/cloud_security_posture/1.9.0-preview04/img/rules.png',
              title: 'Rules page',
              size: '3160x1708',
              type: 'image/png',
            },
          ],
          assets: {
            kibana: {
              csp_rule_template: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '01629238-aea8-5737-a59b-45baf8dab404.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/01629238-aea8-5737-a59b-45baf8dab404.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/02ca1a3a-559e-53d7-afcd-8e3774c4efb9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '02da047f-bc78-5565-86a0-e121850f76c0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/02da047f-bc78-5565-86a0-e121850f76c0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/04e01d1a-d7d4-5020-a398-8aadd3fe32ae.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05480064-f899-53e8-b8ad-34172b09b400.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05480064-f899-53e8-b8ad-34172b09b400.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05676b4e-3274-5984-9981-6aa1623c24ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05676b4e-3274-5984-9981-6aa1623c24ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05c4bd94-162d-53e8-b112-e617ce74f8f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05c4bd94-162d-53e8-b112-e617ce74f8f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '05f0c324-5c11-576f-b7a2-35ebf66f084b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/05f0c324-5c11-576f-b7a2-35ebf66f084b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '06161f41-c17a-586f-b08e-c45ea5157da0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/06161f41-c17a-586f-b08e-c45ea5157da0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '06635c87-1e11-59c3-9eba-b4d8a08ba899.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/06635c87-1e11-59c3-9eba-b4d8a08ba899.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/067385c5-d3a0-536a-bd4f-ed7c1f4033ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '08d850ca-c1be-57e2-ac39-5e38f8750cf6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/08d850ca-c1be-57e2-ac39-5e38f8750cf6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '090923c7-e599-572b-bad3-703f768c262a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/090923c7-e599-572b-bad3-703f768c262a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0bdfe13d-7bc8-5415-8517-65114d344798.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0bdfe13d-7bc8-5415-8517-65114d344798.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0d5ddd5f-749b-516b-89ca-b5bf18ba4861.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '0e318770-7077-5996-afd8-27ca34fc5446.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/0e318770-7077-5996-afd8-27ca34fc5446.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1054ef6c-8f47-5d20-a922-8df0ac93acfa.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1054ef6c-8f47-5d20-a922-8df0ac93acfa.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '129b07b7-4470-5224-8246-6ae975d6304b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/129b07b7-4470-5224-8246-6ae975d6304b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1316108c-33a8-5198-9529-45716c5a87b1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1316108c-33a8-5198-9529-45716c5a87b1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '151312c8-7e97-5420-ac05-5a916b3c1feb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/151312c8-7e97-5420-ac05-5a916b3c1feb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/15c6f217-2ae2-5bb4-8ebe-f40adf02910d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1706a986-39d7-5900-93eb-f191f6a40892.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1706a986-39d7-5900-93eb-f191f6a40892.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '17282e92-075f-593d-99eb-99346e4288ed.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/17282e92-075f-593d-99eb-99346e4288ed.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1915b785-942d-5613-9a24-b40394ef745f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1915b785-942d-5613-9a24-b40394ef745f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1a8ee966-458a-5ff9-a6e9-436aba157ebd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1a8ee966-458a-5ff9-a6e9-436aba157ebd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1b112bf6-61ad-5b08-888b-7b6c86b3526c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1b112bf6-61ad-5b08-888b-7b6c86b3526c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1b89acc6-978c-57c3-b319-680e5251d6f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1b89acc6-978c-57c3-b319-680e5251d6f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1d0a20ee-ad20-5416-84c8-32c0f69b209b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1d0a20ee-ad20-5416-84c8-32c0f69b209b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1d6ff20d-4803-574b-80d2-e47031d9baa2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1d6ff20d-4803-574b-80d2-e47031d9baa2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1e180f0d-3419-5681-838b-9247927eb0f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1e180f0d-3419-5681-838b-9247927eb0f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1e4f8b50-90e4-5e99-8a40-a21b142eb6b4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1ea2df8f-a973-561b-a1f9-a0bea9cfba36.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/1f9c62f6-5c4a-59e6-9a12-0260b7e04a37.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '213e2b33-f2b1-575b-8753-f239b278c25a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/213e2b33-f2b1-575b-8753-f239b278c25a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '23941040-0aae-5afd-bc8d-793742133647.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/23941040-0aae-5afd-bc8d-793742133647.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '23e5f81e-ca05-53bf-8109-7e676feecee3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/23e5f81e-ca05-53bf-8109-7e676feecee3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/266ccbf1-813d-529b-b7a6-3d225d3dc1a9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '26ff6dff-042f-5901-8191-0e347d113e9e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/26ff6dff-042f-5901-8191-0e347d113e9e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '27896f4b-0405-5388-bacd-182e77556711.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/27896f4b-0405-5388-bacd-182e77556711.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '27acd88e-c64f-5e9e-9cff-2de649f92ccf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/27acd88e-c64f-5e9e-9cff-2de649f92ccf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '28f96eda-c94e-597c-aef0-0bceee085540.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/28f96eda-c94e-597c-aef0-0bceee085540.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '29cefccd-77fe-5428-8bea-3fc1390d5d1e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/29cefccd-77fe-5428-8bea-3fc1390d5d1e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2d0044e3-d235-5703-9c16-729932a0131e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2d0044e3-d235-5703-9c16-729932a0131e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/2f7d9d2a-ec1f-545a-8258-ea62bbffad7f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '328a73c3-011d-5827-ae86-4e323739e4e1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/328a73c3-011d-5827-ae86-4e323739e4e1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '33299b3d-68da-5604-8c62-62690fd40c49.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/33299b3d-68da-5604-8c62-62690fd40c49.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '33a612ed-8dee-554d-9dd7-857bfc31a33a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/33a612ed-8dee-554d-9dd7-857bfc31a33a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34a4790c-0214-5eec-b97d-1c11ffa6861e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34a4790c-0214-5eec-b97d-1c11ffa6861e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34b16c08-cf25-5f0d-afed-98f75b5513de.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34b16c08-cf25-5f0d-afed-98f75b5513de.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '34c9c662-5072-5195-835e-48da9be5047f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/34c9c662-5072-5195-835e-48da9be5047f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '368b52f8-b468-5fc7-9e47-b1b5e040e051.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/368b52f8-b468-5fc7-9e47-b1b5e040e051.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '374309b1-b87a-58bd-b795-1067d2e8ee9f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/374309b1-b87a-58bd-b795-1067d2e8ee9f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3760ac17-de0b-537d-8e74-455d132d19d2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3760ac17-de0b-537d-8e74-455d132d19d2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '37fc1edc-a59d-5e63-a530-d3d088195865.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/37fc1edc-a59d-5e63-a530-d3d088195865.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3851b212-b300-545d-8d6b-54ef71c86661.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3851b212-b300-545d-8d6b-54ef71c86661.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '38535c6f-a478-5cbb-82de-9417a3968bd6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/38535c6f-a478-5cbb-82de-9417a3968bd6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '394963fa-63fd-5e81-82eb-ea1b8dfacd53.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/394963fa-63fd-5e81-82eb-ea1b8dfacd53.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3afddcd1-b745-5b3c-8623-ce4abe6878b5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3afddcd1-b745-5b3c-8623-ce4abe6878b5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3bfcca47-de6a-57d4-961f-3c7f5b5f699c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3cd971cb-cf64-51ef-875b-9a7787cd97cb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3cd971cb-cf64-51ef-875b-9a7787cd97cb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3d701761-f9b6-5c2d-ab99-928161d2ebbd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3d701761-f9b6-5c2d-ab99-928161d2ebbd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3ed0b9d8-c5f2-55e2-92a5-2531868e79ca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3ef4430e-2829-576a-a813-edc766625ea9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3ef4430e-2829-576a-a813-edc766625ea9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/3fb6051e-31f8-5fb5-bd45-4f140fa4442e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '40ab36e3-7438-5c36-afcd-bf5f5401366e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/40ab36e3-7438-5c36-afcd-bf5f5401366e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '421191d6-a13c-5c78-8c5b-102e1229655f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/421191d6-a13c-5c78-8c5b-102e1229655f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/429ada1f-ad8f-5c2d-97fd-31485ace8a0c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '43d5538c-17a3-5e04-9c06-ad4323bfd188.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/43d5538c-17a3-5e04-9c06-ad4323bfd188.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '449bf7bf-8070-580f-a3aa-66bc7f94a721.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/449bf7bf-8070-580f-a3aa-66bc7f94a721.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '461c5ca2-0173-5b8c-ae36-b229cffefbb2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/461c5ca2-0173-5b8c-ae36-b229cffefbb2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '47ee9344-791e-50e4-a266-ee2ebce093a7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/47ee9344-791e-50e4-a266-ee2ebce093a7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4931d684-a386-5545-b2c4-47b836e0149b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4931d684-a386-5545-b2c4-47b836e0149b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '49c71814-2dbe-5204-ad07-879a80503fbc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/49c71814-2dbe-5204-ad07-879a80503fbc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '49fe9df5-e86f-5981-ac24-dcaadadc2790.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/49fe9df5-e86f-5981-ac24-dcaadadc2790.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4a130791-cdb3-5524-b45d-1f3df79e2452.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4a130791-cdb3-5524-b45d-1f3df79e2452.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4a6a8b7a-d7a2-5a52-af5c-70009500bbc5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4b11956d-7985-524e-900e-20405e2baaca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4b11956d-7985-524e-900e-20405e2baaca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4b1f12b8-5fe6-5cc6-b404-58df727bcd45.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4cfe4df4-4157-53bb-820f-278fe02ec960.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4cfe4df4-4157-53bb-820f-278fe02ec960.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4d0a1c5a-27b5-5429-895d-e90878fcce1d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4d0a1c5a-27b5-5429-895d-e90878fcce1d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4da6e870-fed1-5822-bb2d-f6a1714bc4a8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4eb0d962-c123-575e-8c0c-9d10a2fbe5d1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/506b205e-9b6a-5d6e-b136-3e5d7101b1bc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '50da62ee-4099-5950-ba1e-984794749f28.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/50da62ee-4099-5950-ba1e-984794749f28.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5133d843-d913-5c1c-930f-89560b828704.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5133d843-d913-5c1c-930f-89560b828704.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5382994d-59e0-54d9-a32b-dd860c467813.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5382994d-59e0-54d9-a32b-dd860c467813.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5411a1e9-a529-5512-b556-93178e544c9e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5411a1e9-a529-5512-b556-93178e544c9e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '551d3a0b-36f6-51c6-ba8b-0a83926b1864.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/551d3a0b-36f6-51c6-ba8b-0a83926b1864.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '551e7bcf-b231-500d-a193-d0a98163a680.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/551e7bcf-b231-500d-a193-d0a98163a680.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '555cf8d5-f963-5574-a856-e06614cf9341.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/555cf8d5-f963-5574-a856-e06614cf9341.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5cdc703f-54ea-5de6-97c4-9fdb495725ef.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5cdc703f-54ea-5de6-97c4-9fdb495725ef.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5d7e7fce-64fb-5b7b-beeb-920496c2e333.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5d7e7fce-64fb-5b7b-beeb-920496c2e333.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5dd8b281-9a80-50a7-a03d-fe462a5a2ba0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ee4897d-808b-5ad6-877b-a276f8e65076.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ee4897d-808b-5ad6-877b-a276f8e65076.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '5ee69b99-8f70-5daf-b784-866131aca3ba.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/5ee69b99-8f70-5daf-b784-866131aca3ba.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '61ab077c-fc0f-5920-8bcf-ccc037a4139b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/61ab077c-fc0f-5920-8bcf-ccc037a4139b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '62b717ac-bb8f-5274-a99f-5806dc4427a5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/62b717ac-bb8f-5274-a99f-5806dc4427a5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '64d37675-473f-5edc-882e-5b8b85b789c3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/64d37675-473f-5edc-882e-5b8b85b789c3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '64feecfc-7166-5d77-b830-bf4a8dd2e05d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/64feecfc-7166-5d77-b830-bf4a8dd2e05d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6588bb48-d02b-5169-a013-fe4dc115c709.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6588bb48-d02b-5169-a013-fe4dc115c709.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '668cee84-c115-5166-a422-05c4d3e88c2c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/668cee84-c115-5166-a422-05c4d3e88c2c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '66cd0518-cfa3-5917-a399-a7dfde4e19db.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/66cd0518-cfa3-5917-a399-a7dfde4e19db.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '66cdd4cc-5870-50e1-959c-91443716b87a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/66cdd4cc-5870-50e1-959c-91443716b87a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/677bdabb-ee3f-58a6-82f6-d40ccc4efe13.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '67909c46-649c-52c1-a464-b3e81615d938.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/67909c46-649c-52c1-a464-b3e81615d938.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '68cfd04b-fc79-5877-8638-af3aa82d92db.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/68cfd04b-fc79-5877-8638-af3aa82d92db.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '68f9d23f-882f-55d1-86c6-711413c31129.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/68f9d23f-882f-55d1-86c6-711413c31129.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '69ffe7f6-bc09-5019-ba77-a2f81169e9de.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/69ffe7f6-bc09-5019-ba77-a2f81169e9de.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6b3b122f-ac19-5a57-b6d0-131daf3fbf6d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6d58f558-d07a-541c-b720-689459524679.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6d58f558-d07a-541c-b720-689459524679.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6de73498-23d7-537f-83f3-08c660217e7e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6de73498-23d7-537f-83f3-08c660217e7e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e339632-0d1c-5a7c-8ca3-fac5813932d9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e339632-0d1c-5a7c-8ca3-fac5813932d9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e46620d-cf63-55f9-b025-01889df276fd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e46620d-cf63-55f9-b025-01889df276fd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '6e6481f1-5ede-552b-84e5-cceed281052a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/6e6481f1-5ede-552b-84e5-cceed281052a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '70f92ed3-5659-5c95-a8f8-a63211c57635.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/70f92ed3-5659-5c95-a8f8-a63211c57635.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '71cd1aed-48f7-5490-a63d-e22436549822.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/71cd1aed-48f7-5490-a63d-e22436549822.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '72bb12e0-31c0-54f4-a409-4aace3b602be.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/72bb12e0-31c0-54f4-a409-4aace3b602be.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '737dc646-1c66-5fb6-8fcd-1aac6402532d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/737dc646-1c66-5fb6-8fcd-1aac6402532d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '741aa940-22a7-5015-95d5-f94b331d774e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/741aa940-22a7-5015-95d5-f94b331d774e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '756e1a54-b2ce-56b9-a13f-17f652d7767c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/756e1a54-b2ce-56b9-a13f-17f652d7767c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '76be4dd2-a77a-5981-a893-db6770b35911.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/76be4dd2-a77a-5981-a893-db6770b35911.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/76fea8f6-7bf2-5dc4-85f0-1aec20fbf100.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '77d274cb-69ae-5a85-b8f6-ba192aee8af4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/77d274cb-69ae-5a85-b8f6-ba192aee8af4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7a2ab526-3440-5a0f-804c-c5eea8158053.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7a2ab526-3440-5a0f-804c-c5eea8158053.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7bb02abe-d669-5058-a2d6-6ce5ee2dc2be.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7c908585-ec93-52dc-81bb-ceb17cd4c313.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7c908585-ec93-52dc-81bb-ceb17cd4c313.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7d1de53a-a32e-55c0-b412-317ed91f65e0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7d1de53a-a32e-55c0-b412-317ed91f65e0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7e584486-4d0f-5edb-8a64-7ee0b59333b8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7e584486-4d0f-5edb-8a64-7ee0b59333b8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/7eebf1d9-7a68-54fd-89b7-0f8b1441a179.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '80db9189-cd4d-572a-94dc-e635ee8af7fa.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/80db9189-cd4d-572a-94dc-e635ee8af7fa.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '81554879-3338-5208-9db3-efb2a549d38c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/81554879-3338-5208-9db3-efb2a549d38c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8233dcc7-c6af-5110-b7d4-239a70d7bed5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8233dcc7-c6af-5110-b7d4-239a70d7bed5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84862c2c-4aba-5458-9c5f-12855091617b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84862c2c-4aba-5458-9c5f-12855091617b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84b8b7be-d917-50f3-beab-c076d0098d83.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84b8b7be-d917-50f3-beab-c076d0098d83.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '84c7925a-42ff-5999-b784-ab037f6242c6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/84c7925a-42ff-5999-b784-ab037f6242c6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '873e6387-218d-587a-8fa1-3d65f4a77802.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/873e6387-218d-587a-8fa1-3d65f4a77802.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '875c1196-b6c7-5bc9-b255-e052853c3d08.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/875c1196-b6c7-5bc9-b255-e052853c3d08.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '87952b8d-f537-5f8a-b57b-63a31b031170.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/87952b8d-f537-5f8a-b57b-63a31b031170.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '882ffc80-73e9-56aa-ae72-73b39af6702f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/882ffc80-73e9-56aa-ae72-73b39af6702f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '88634421-e47c-59fb-9466-a86023f20dd5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/88634421-e47c-59fb-9466-a86023f20dd5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '88734e31-d055-58ba-bf70-7d40d0b4e707.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/88734e31-d055-58ba-bf70-7d40d0b4e707.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89a294ae-d736-51ca-99d4-0ea4782caed0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89a294ae-d736-51ca-99d4-0ea4782caed0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89b58088-54f6-55dc-96a3-f08ac4b27ea3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89b58088-54f6-55dc-96a3-f08ac4b27ea3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89cc8ff0-be81-55f2-b1cf-d7db1e214741.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89cc8ff0-be81-55f2-b1cf-d7db1e214741.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '89ebec6b-3cc4-5898-a3b9-534174f93051.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/89ebec6b-3cc4-5898-a3b9-534174f93051.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8a985fda-fc4c-5435-b7f0-c4d40bb1307a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8c36c21b-3c8f-5a92-bc7e-62871428f4d2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8d3f2919-da46-5502-b48b-9ba41d03281b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8d3f2919-da46-5502-b48b-9ba41d03281b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8f2644ed-70b5-576f-b9b9-aabea6821749.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8f2644ed-70b5-576f-b9b9-aabea6821749.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '8f88e7f7-6924-5913-bc18-95fcdc5ae744.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/8f88e7f7-6924-5913-bc18-95fcdc5ae744.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '900567f0-4c2f-543a-b5cf-d11223a772a2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/900567f0-4c2f-543a-b5cf-d11223a772a2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9126cd85-611c-5b06-b2f2-a18338e26ae1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9126cd85-611c-5b06-b2f2-a18338e26ae1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '919ef7a7-126c-517e-aa35-fb251b1ad587.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/919ef7a7-126c-517e-aa35-fb251b1ad587.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '91d52d43-da61-5ba2-a4d4-1018fee84559.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/91d52d43-da61-5ba2-a4d4-1018fee84559.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '92077c86-0322-5497-b94e-38ef356eadd6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/92077c86-0322-5497-b94e-38ef356eadd6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9209df46-e7e2-5d4b-b1b6-b54a196e7e5d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9259a915-0294-54d6-b379-162ceb36e875.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9259a915-0294-54d6-b379-162ceb36e875.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9272d2b5-4e25-5658-8a6c-d917f60134ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9272d2b5-4e25-5658-8a6c-d917f60134ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '92ab0102-d825-52ce-87a8-1d0b4e06166c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/92ab0102-d825-52ce-87a8-1d0b4e06166c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '933268ec-44e8-5fba-9ed7-535804521cc7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/933268ec-44e8-5fba-9ed7-535804521cc7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '934583bd-306a-51d9-a730-020bd45f7f01.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/934583bd-306a-51d9-a730-020bd45f7f01.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '93808f1f-f05e-5e48-b130-5527795e6158.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/93808f1f-f05e-5e48-b130-5527795e6158.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '94fb43f8-90da-5089-b503-66a04faa2630.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/94fb43f8-90da-5089-b503-66a04faa2630.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '94fbdc26-aa6f-52e6-9277-094174c46e29.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/94fbdc26-aa6f-52e6-9277-094174c46e29.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/95e368ec-eebe-5aa1-bc86-9fa532a82d3a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9718b528-8327-5eef-ad21-c8bed5532429.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9718b528-8327-5eef-ad21-c8bed5532429.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '97504079-0d62-5d0a-9939-17b57b444547.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/97504079-0d62-5d0a-9939-17b57b444547.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9a0d57ac-a54d-5652-bf07-982d542bf296.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9a0d57ac-a54d-5652-bf07-982d542bf296.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9a9d808f-61a9-55b7-a487-9d50fd2983c5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9a9d808f-61a9-55b7-a487-9d50fd2983c5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9c2d1c63-7bf3-584d-b87a-043853dad7a4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9c2d1c63-7bf3-584d-b87a-043853dad7a4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9ce2276b-db96-5aad-9329-08ce874c5db6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9ce2276b-db96-5aad-9329-08ce874c5db6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9ef34b4f-b9e1-566b-8a2b-69f8933fa852.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fb9a46f-de59-580b-938e-829090bd3975.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fb9a46f-de59-580b-938e-829090bd3975.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fc74adb-6ddd-5838-be72-cfd17fbfb74b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: '9fcbc87c-0963-58ba-8e21-87e22b80fc27.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/9fcbc87c-0963-58ba-8e21-87e22b80fc27.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a1f327c0-3e4b-5b55-891a-b91e720cd535.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a1f327c0-3e4b-5b55-891a-b91e720cd535.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a22a5431-1471-534c-8e7c-1e16fe0a857c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a22a5431-1471-534c-8e7c-1e16fe0a857c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a2447c19-a799-5270-9e03-ac322c2396d5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a2447c19-a799-5270-9e03-ac322c2396d5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a3ffdc15-c93b-52a5-8e26-a27103b85bf3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a4b61e0e-b0ca-53c5-a744-4587c57e0f2d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a501efd2-73b9-5f92-a2c7-fa03ae753140.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a501efd2-73b9-5f92-a2c7-fa03ae753140.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a52c1d16-d925-545d-bbd9-4257c2485eea.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a52c1d16-d925-545d-bbd9-4257c2485eea.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a6074b1d-e115-5416-bdc5-6e1940effd09.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a6074b1d-e115-5416-bdc5-6e1940effd09.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a6a43181-3a24-5ead-b845-1f1b56c95ad5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a72cb3ec-36ae-56b0-815f-9f986f0d499f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a7c6b368-29db-53e6-8b86-dfaddf719f59.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a7c6b368-29db-53e6-8b86-dfaddf719f59.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a97eb244-d583-528c-a49a-17b0aa14decd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a97eb244-d583-528c-a49a-17b0aa14decd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/a9f473e3-a8b4-5076-b59a-f0d1c5a961ba.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'aa4374f0-adab-580c-ac9d-907fd2783219.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/aa4374f0-adab-580c-ac9d-907fd2783219.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ab555e6d-b77e-5c85-b6a8-333f7e567b6b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'abc6f4b4-3add-57c4-973d-c678df60804c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/abc6f4b4-3add-57c4-973d-c678df60804c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ad4de26d-02a8-5202-b718-48147bf0fd03.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ad4de26d-02a8-5202-b718-48147bf0fd03.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/af0e7adc-2f70-5bf5-bce4-abf418bee40b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b0a70444-c719-5772-a8c1-2cd72578f8ee.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b0a70444-c719-5772-a8c1-2cd72578f8ee.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b0ed2847-4db1-57c3-b2b6-49b0576a2506.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b190337a-56a7-5906-8960-76fd05283599.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b190337a-56a7-5906-8960-76fd05283599.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b1b40df2-f562-564a-9d43-94774e1698d1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b1b40df2-f562-564a-9d43-94774e1698d1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b287617d-7623-5d72-923d-e79b1301e06c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b287617d-7623-5d72-923d-e79b1301e06c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b2909440-5ad0-522e-8db0-9439d573b7d5.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b2909440-5ad0-522e-8db0-9439d573b7d5.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b3b3c352-fc81-5874-8bbc-31e2f58e884e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b4133ca4-32f1-501e-ad0a-a22700208a4f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b4133ca4-32f1-501e-ad0a-a22700208a4f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b42eb917-8a4e-5cb7-93b1-886dbf2751bc.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b449135c-8747-58fe-9d46-218728745520.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b449135c-8747-58fe-9d46-218728745520.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b5493b70-e25f-54e6-9931-36138c33f775.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b5493b70-e25f-54e6-9931-36138c33f775.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b56e76ca-b976-5b96-ab3f-359e5b51ddf2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b6189255-e8a5-5a01-87a6-a1b408a0d92a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b64386ab-20fa-57d2-9b5b-631d64181531.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b64386ab-20fa-57d2-9b5b-631d64181531.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b78aca72-f2c1-5cc2-b481-3f056f91bf4b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b794635d-a338-5b4e-bfa0-75257e854c6a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b794635d-a338-5b4e-bfa0-75257e854c6a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b8c40039-034b-5299-8660-a7c8d34efe36.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b8c40039-034b-5299-8660-a7c8d34efe36.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b8f1182a-1b3e-5b08-8482-f74949163e97.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b8f1182a-1b3e-5b08-8482-f74949163e97.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'b96194c6-8eb7-5835-852d-47b84db83697.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/b96194c6-8eb7-5835-852d-47b84db83697.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ba545cc3-f447-5d14-8841-d3d3c05024e8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ba545cc3-f447-5d14-8841-d3d3c05024e8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bac65dd0-771b-5bfb-8e5f-3b1dc8962684.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bb264405-de3e-5b91-9654-2056f905fc67.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bb264405-de3e-5b91-9654-2056f905fc67.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bbc219e5-75d8-55d6-bccb-7d1acef796bf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bc5fb87e-7195-5318-9a2f-b8f6d487f961.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'be1197db-90d0-58db-b780-f0a939264bd0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/be1197db-90d0-58db-b780-f0a939264bd0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c0ef1e12-b201-5736-8475-4b62978084e8.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c0ef1e12-b201-5736-8475-4b62978084e8.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c13f49ab-845e-5a89-a05e-6a7c7b23f628.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c1581c69-3e5c-5ab2-bdde-3619955a1dcf.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c1e1ca12-c0e2-543e-819d-22249927d241.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c1e1ca12-c0e2-543e-819d-22249927d241.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c28e606d-f6a7-58b2-820f-e2fb702bf956.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c28e606d-f6a7-58b2-820f-e2fb702bf956.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c2b36f84-34b5-57fd-b9b0-f225be981497.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c2b36f84-34b5-57fd-b9b0-f225be981497.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c2d65e60-221b-5748-a545-579a69ad4a93.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c2d65e60-221b-5748-a545-579a69ad4a93.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c40bebb5-5403-59d8-b960-00d6946931ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c40bebb5-5403-59d8-b960-00d6946931ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c43a57db-5248-5855-a613-2a05d0a42768.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c43a57db-5248-5855-a613-2a05d0a42768.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c444d9e3-d3de-5598-90e7-95a922b51664.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c444d9e3-d3de-5598-90e7-95a922b51664.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c455dba0-a768-5c76-8509-3484ec33102f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c455dba0-a768-5c76-8509-3484ec33102f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c52e86bd-55f1-5c6a-8349-918f97963346.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c52e86bd-55f1-5c6a-8349-918f97963346.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c53dab24-a23f-53c6-8d36-f64cc03ab277.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c53dab24-a23f-53c6-8d36-f64cc03ab277.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c67fb159-cec6-5114-bbfe-f9a1e57fdcd4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c8a8f827-fba6-58ee-80b8-e64a605a4902.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c8a8f827-fba6-58ee-80b8-e64a605a4902.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c8f24be5-fd7d-510f-ab93-2440bb826750.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c8f24be5-fd7d-510f-ab93-2440bb826750.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/c9e64bdb-9225-5f60-b31c-a2d62f5427f9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cb57543f-5435-55b5-97cf-bda29ec9094a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cb57543f-5435-55b5-97cf-bda29ec9094a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cd05adf8-d0fe-54b6-b1a0-93cf02bcec72.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'cda5f949-378c-5ef6-a65e-47187af983e4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/cda5f949-378c-5ef6-a65e-47187af983e4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d117cea4-376b-5cb7-ad81-58a2f4efb47e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd1d73385-2909-598a-acf7-bf1d8130f314.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d1d73385-2909-598a-acf7-bf1d8130f314.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d1f8d730-5ee2-56bb-8065-78e8c8ae668c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd248e880-7d96-5559-a25c-0f56c289a2e7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d248e880-7d96-5559-a25c-0f56c289a2e7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd303c4f1-489c-56ca-add9-29820c2214af.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d303c4f1-489c-56ca-add9-29820c2214af.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd3d725bd-652f-573e-97f5-adfd002fab8e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d3d725bd-652f-573e-97f5-adfd002fab8e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d416ff74-0e84-56cc-a577-0cdeb6a220f6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd498d11f-6c2a-5593-b6c6-6960b28da84e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d498d11f-6c2a-5593-b6c6-6960b28da84e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd57d6506-a519-5a29-a816-b1204ebfef21.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d57d6506-a519-5a29-a816-b1204ebfef21.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d63a2fd8-7ba2-5589-9899-23f99fd8c846.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d7011f2f-cd60-58cf-a184-eb2d5fb7339a.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/d98f24a9-e788-55d2-8b70-e9fe88311f9c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dafb527b-9869-5062-8d38-c9dced4a27c2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dafb527b-9869-5062-8d38-c9dced4a27c2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'db28165f-6f7c-5450-b9f3-61c7b897d833.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/db28165f-6f7c-5450-b9f3-61c7b897d833.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'db58a1e4-de58-5899-bee8-f6ced89d6f80.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/db58a1e4-de58-5899-bee8-f6ced89d6f80.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dbd6a799-b6c3-5768-ab68-9bd6f63bbd48.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dfc17731-aa8f-5ecc-878b-113d1db009ca.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dfc17731-aa8f-5ecc-878b-113d1db009ca.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/dfc4b9b5-43dc-5ec2-97b4-76a71621fa40.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e06f9ef1-eedb-5f95-b8d4-36d27d602afd.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e073f962-74d9-585b-ae5a-e37c461e9b7c.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e073f962-74d9-585b-ae5a-e37c461e9b7c.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e1b73c05-5137-5b65-9513-6f8018b6deff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e1b73c05-5137-5b65-9513-6f8018b6deff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e1c469c1-89d2-5cbd-a1f1-fe8f636b151f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e2306922-4f95-5660-bf2e-9610f556de69.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e2306922-4f95-5660-bf2e-9610f556de69.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e24bf247-bfdc-5bbf-9813-165b905b52e6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e24bf247-bfdc-5bbf-9813-165b905b52e6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e3c6b85b-703e-5891-a01f-640d59ec449e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e3c6b85b-703e-5891-a01f-640d59ec449e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e570dc22-4f5d-51db-a193-983cb7d20afe.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e570dc22-4f5d-51db-a193-983cb7d20afe.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e833e6a8-673d-56b2-a979-f9aa4e52cb71.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e83a8e8a-e34b-5a01-8142-82d5aef60cab.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'e92ddce9-3cba-5e3d-adac-53df0350eca0.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/e92ddce9-3cba-5e3d-adac-53df0350eca0.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ea3378aa-250e-50d8-9260-ff8237cf09a2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ea3378aa-250e-50d8-9260-ff8237cf09a2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eb9e71ae-113b-5631-9e5c-b7fdc0b0666e.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ec7949d4-9e55-5f44-8c4a-a0e674a2a46f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ed797ade-c473-5b6a-b1e2-1fd4410f7156.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eda32e5d-3684-5205-b3a4-bbddacddc60f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eda32e5d-3684-5205-b3a4-bbddacddc60f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/edccbc31-3c4d-5d38-af6a-7fd1d9860bff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ede1488a-e8cd-5d5f-a25d-96c136695594.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ede1488a-e8cd-5d5f-a25d-96c136695594.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eeb00e89-7125-58e8-9248-b9f429583277.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eeb00e89-7125-58e8-9248-b9f429583277.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'eed3e284-5030-56db-b749-01d7120dc577.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/eed3e284-5030-56db-b749-01d7120dc577.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ef3852ff-b0f9-51d5-af6d-b1b1fed72005.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'efec59bf-4563-5da7-a1db-f5c28e93b21f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/efec59bf-4563-5da7-a1db-f5c28e93b21f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f00c266c-0e28-5c49-b2b0-cd97603341ec.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f00c266c-0e28-5c49-b2b0-cd97603341ec.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f1322e13-3fb3-5c9c-be8e-29d4ae293d22.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f44d0940-2e62-5993-9028-d3e63ae23960.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f44d0940-2e62-5993-9028-d3e63ae23960.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f507bb23-1a9d-55dd-8edc-19a33e64d646.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f507bb23-1a9d-55dd-8edc-19a33e64d646.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f512a987-4f86-5fb3-b202-6b5de22a739f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f512a987-4f86-5fb3-b202-6b5de22a739f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f55af438-f955-51d3-b42f-60b0d48d86e4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f55af438-f955-51d3-b42f-60b0d48d86e4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f5f029ea-d16e-5661-bc66-3096aaeda2f3.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f62488d2-4b52-57d4-8ecd-d8f47dcb3dda.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f6cfd4ce-1b96-5871-aa9d-8dba2d701579.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f6d0110b-51c5-54db-a531-29b0cb58d0f2.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f78dad83-1fe2-5aba-8507-64ea9efb53d6.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f8c6e5cf-cfce-5c11-b303-a20c7c1cd694.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f9344da7-b640-5587-98b8-9d9066000883.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f9344da7-b640-5587-98b8-9d9066000883.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fa9bbc09-3b1f-5344-a4a4-523a899a35b7.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fb4368ab-cdee-5188-814c-a8197411ba22.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fb4368ab-cdee-5188-814c-a8197411ba22.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fb8759d0-8564-572c-9042-d395b7e0b74d.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fb8759d0-8564-572c-9042-d395b7e0b74d.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fcc4b1b4-13e6-5908-be80-7ed36211de90.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fcc4b1b4-13e6-5908-be80-7ed36211de90.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fd42f0d0-6e1d-53e5-b322-9a0eaa56948b.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fdff0b83-dc73-5d60-9ad3-b98ed139a1b4.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fe083488-fa0f-5408-9624-ac27607ac2ff.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fe083488-fa0f-5408-9624-ac27607ac2ff.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'fe219241-4b9c-585f-b982-bb248852baa1.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/fe219241-4b9c-585f-b982-bb248852baa1.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'csp_rule_template',
                  file: 'ffc9fb91-dc44-512b-a558-036e8ce11282.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/csp_rule_template/ffc9fb91-dc44-512b-a558-036e8ce11282.json',
                },
              ],
              index_pattern: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f.json',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'kibana',
                  type: 'index_pattern',
                  file: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b.json',
                  path: 'cloud_security_posture-1.9.0-preview04/kibana/index_pattern/cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b.json',
                },
              ],
            },
            elasticsearch: {
              ilm: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ilm',
                  file: 'default_policy.json',
                  dataset: 'findings',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/findings/elasticsearch/ilm/default_policy.json',
                },
              ],
              ingest_pipeline: [
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ingest_pipeline',
                  file: 'default.yml',
                  dataset: 'findings',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/findings/elasticsearch/ingest_pipeline/default.yml',
                },
                {
                  pkgkey: 'cloud_security_posture-1.9.0-preview04',
                  service: 'elasticsearch',
                  type: 'ingest_pipeline',
                  file: 'default.yml',
                  dataset: 'vulnerabilities',
                  path: 'cloud_security_posture-1.9.0-preview04/data_stream/vulnerabilities/elasticsearch/ingest_pipeline/default.yml',
                },
              ],
            },
          },
          policy_templates: [
            {
              name: 'kspm',
              title: 'Kubernetes Security Posture Management (KSPM)',
              description: 'Identify & remediate configuration risks in Kubernetes',
              data_streams: ['findings'],
              inputs: [
                {
                  type: 'cloudbeat/cis_k8s',
                  title: 'CIS Kubernetes Benchmark',
                  description: 'CIS Benchmark for Kubernetes',
                },
                {
                  type: 'cloudbeat/cis_eks',
                  title: 'Amazon EKS Benchmark',
                  description: 'CIS Benchmark for Amazon Elastic Kubernetes Service (EKS)',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_kspm.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_kspm.svg',
                  title: 'KSPM logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['containers', 'kubernetes', 'security', 'aws'],
              screenshots: [
                {
                  src: '/img/dashboard.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/dashboard.png',
                  title: 'Dashboard page',
                  size: '1293x718',
                  type: 'image/png',
                },
              ],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/kspm.md',
            },
            {
              name: 'cspm',
              title: 'Cloud Security Posture Management (CSPM)',
              description:
                'Identify & remediate configuration risks in the Cloud services you leverage',
              data_streams: ['findings'],
              inputs: [
                {
                  type: 'cloudbeat/cis_aws',
                  vars: [
                    {
                      name: 'cloud_formation_template',
                      type: 'text',
                      title: 'CloudFormation Template',
                      description: 'Template URL to Cloud Formation Quick Create Stack',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.14.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
                    },
                  ],
                  title: 'Amazon Web Services',
                  description: 'CIS Benchmark for Amazon Web Services Foundations',
                },
                {
                  type: 'cloudbeat/cis_gcp',
                  vars: [
                    {
                      name: 'cloud_shell_url',
                      type: 'text',
                      title: 'CloudShell URL',
                      description: 'A URL to CloudShell for creating a new deployment',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://shell.cloud.google.com/cloudshell/?ephemeral=true&cloudshell_git_repo=https%3A%2F%2Fgithub.com%2Felastic%2Fcloudbeat&cloudshell_git_branch=8.14&cloudshell_workspace=deploy%2Fdeployment-manager&show=terminal',
                    },
                  ],
                  title: 'GCP',
                  description: 'CIS Benchmark for Google Cloud Platform Foundations',
                },
                {
                  type: 'cloudbeat/cis_azure',
                  vars: [
                    {
                      name: 'arm_template_url',
                      type: 'text',
                      title: 'ARM Template URL',
                      description: 'A URL to the ARM Template for creating a new deployment',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fcloudbeat%2F8.14%2Fdeploy%2Fazure%2FARM-for-ACCOUNT_TYPE.json',
                    },
                  ],
                  title: 'Azure',
                  description: 'CIS Benchmark for Microsoft Azure Foundations',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_cspm.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_cspm.svg',
                  title: 'CSPM logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['security', 'cloud', 'aws', 'google_cloud'],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/cspm.md',
            },
            {
              name: 'vuln_mgmt',
              title: 'Cloud Native Vulnerability Management (CNVM)',
              description: 'Scan for cloud workload vulnerabilities',
              data_streams: ['vulnerabilities'],
              inputs: [
                {
                  type: 'cloudbeat/vuln_mgmt_aws',
                  vars: [
                    {
                      name: 'cloud_formation_template',
                      type: 'text',
                      title: 'CloudFormation Template',
                      description: 'Template URL to Cloud Formation Quick Create Stack',
                      multi: false,
                      required: true,
                      show_user: false,
                      default:
                        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cnvm-8.14.0.yml&stackName=Elastic-Vulnerability-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
                    },
                  ],
                  title: 'Amazon Web Services Vulnerability Management',
                  description: 'Vulnerability scan over running resources',
                },
              ],
              multiple: true,
              icons: [
                {
                  src: '/img/logo_vuln_mgmt.svg',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/logo_vuln_mgmt.svg',
                  title: 'Vulnerability Management logo',
                  size: '32x32',
                  type: 'image/svg+xml',
                },
              ],
              categories: ['security', 'cloud'],
              screenshots: [
                {
                  src: '/img/cnvm_vulnerabilities_table.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/cnvm_vulnerabilities_table.png',
                  title: 'Vulnerabilities Table',
                  size: '3420x1912',
                  type: 'image/png',
                },
                {
                  src: '/img/cnvm_vulnerabilities_flyout.png',
                  path: '/package/cloud_security_posture/1.9.0-preview04/img/cnvm_vulnerabilities_flyout.png',
                  title: 'Vulnerability',
                  size: '3452x1926',
                  type: 'image/png',
                },
              ],
              readme: '/package/cloud_security_posture/1.9.0-preview04/docs/vuln_mgmt.md',
            },
          ],
          data_streams: [
            {
              type: 'logs',
              dataset: 'cloud_security_posture.findings',
              ilm_policy: 'logs-cloud_security_posture.findings-default_policy',
              title: 'Cloud Security Posture Findings',
              release: 'beta',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'cloudbeat/cis_k8s',
                  template_path: 'vanilla.yml.hbs',
                  title: 'CIS Kubernetes Benchmark',
                  description: 'CIS Benchmark for Kubernetes',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_eks',
                  vars: [
                    {
                      name: 'access_key_id',
                      type: 'text',
                      title: 'Access Key ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'secret_access_key',
                      type: 'text',
                      title: 'Secret Access Key',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'session_token',
                      type: 'text',
                      title: 'Session Token',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'shared_credential_file',
                      type: 'text',
                      title: 'Shared Credential File',
                      description: 'Directory of the shared credentials file',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'credential_profile_name',
                      type: 'text',
                      title: 'Credential Profile Name',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'role_arn',
                      type: 'text',
                      title: 'ARN Role',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.credentials.type',
                      type: 'text',
                      title: 'Credential type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                  ],
                  template_path: 'eks.yml.hbs',
                  title: 'Amazon EKS Benchmark',
                  description: 'CIS Benchmark for Amazon Elastic Kubernetes Service (EKS)',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_aws',
                  vars: [
                    {
                      name: 'access_key_id',
                      type: 'text',
                      title: 'Access Key ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'secret_access_key',
                      type: 'text',
                      title: 'Secret Access Key',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'session_token',
                      type: 'text',
                      title: 'Session Token',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'shared_credential_file',
                      type: 'text',
                      title: 'Shared Credential File',
                      description: 'Directory of the shared credentials file',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'credential_profile_name',
                      type: 'text',
                      title: 'Credential Profile Name',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'role_arn',
                      type: 'text',
                      title: 'ARN Role',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'aws.account_type',
                      type: 'text',
                      title: 'Fetch resources from AWS organization instead of single account',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                  ],
                  template_path: 'aws.yml.hbs',
                  title: 'CIS AWS Benchmark',
                  description: 'CIS Benchmark for Amazon Web Services Foundations',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_gcp',
                  vars: [
                    {
                      name: 'gcp.account_type',
                      type: 'text',
                      title: 'Account Type',
                      multi: false,
                      required: true,
                      show_user: false,
                    },
                    {
                      name: 'gcp.organization_id',
                      type: 'text',
                      title: 'Organization Id',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'gcp.project_id',
                      type: 'text',
                      title: 'Project Id',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'gcp.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'gcp.credentials.file',
                      type: 'text',
                      title: 'Credentials file',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'gcp.credentials.json',
                      type: 'text',
                      title: 'Credentials json',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                  ],
                  template_path: 'gcp.yml.hbs',
                  title: 'CIS GCP Benchmark',
                  description: 'CIS Benchmark for Google Cloud Platform Foundation',
                  enabled: false,
                },
                {
                  input: 'cloudbeat/cis_azure',
                  vars: [
                    {
                      name: 'azure.account_type',
                      type: 'text',
                      title: 'Account type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'azure.credentials.type',
                      type: 'text',
                      title: 'Credentials type',
                      multi: false,
                      required: false,
                      show_user: false,
                    },
                    {
                      name: 'azure.credentials.client_id',
                      type: 'text',
                      title: 'Client ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.tenant_id',
                      type: 'text',
                      title: 'Tenant ID',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_secret',
                      type: 'text',
                      title: 'Client Secret',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_username',
                      type: 'text',
                      title: 'Client Username',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_password',
                      type: 'text',
                      title: 'Client Password',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_certificate_path',
                      type: 'text',
                      title: 'Client Certificate Path',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'azure.credentials.client_certificate_password',
                      type: 'text',
                      title: 'Client Certificate Password',
                      multi: false,
                      required: false,
                      show_user: true,
                    },
                  ],
                  template_path: 'azure.yml.hbs',
                  title: 'CIS Azure Benchmark',
                  description: 'CIS Benchmark for Microsoft Azure Foundations',
                  enabled: false,
                },
              ],
              package: 'cloud_security_posture',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
                'ingest_pipeline.name': 'default',
              },
              path: 'findings',
            },
            {
              type: 'logs',
              dataset: 'cloud_security_posture.vulnerabilities',
              title: 'Cloud Vulnerabilities',
              release: 'beta',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'cloudbeat/vuln_mgmt_aws',
                  template_path: 'aws.yml.hbs',
                  title: 'Vulnerability Management AWS',
                  description:
                    'Scan for vulnerabilities over AWS account EC2 instances and docker images',
                  enabled: false,
                },
              ],
              package: 'cloud_security_posture',
              elasticsearch: {
                'index_template.mappings': {
                  dynamic: false,
                },
                'ingest_pipeline.name': 'default',
              },
              path: 'vulnerabilities',
            },
          ],
          vars: [
            {
              name: 'posture',
              type: 'text',
              title: 'Posture type',
              description: 'Chosen posture type (cspm/kspm)',
              multi: false,
              required: true,
              show_user: false,
            },
            {
              name: 'deployment',
              type: 'text',
              title: 'Deployment type',
              description: 'Chosen deployment type (aws/gcp/azure/eks/k8s)',
              multi: false,
              required: true,
              show_user: false,
            },
          ],
          latestVersion: '1.9.0-preview04',
          licensePath: '/package/cloud_security_posture/1.9.0-preview04/LICENSE.txt',
          keepPoliciesUpToDate: true,
          status: 'installed',
          savedObject: {
            id: 'cloud_security_posture',
            type: 'epm-packages',
            namespaces: [],
            updated_at: '2024-04-29T21:55:18.196Z',
            created_at: '2024-04-04T14:57:54.879Z',
            version: 'WzE4NzE0LDZd',
            attributes: {
              installed_kibana: [
                {
                  id: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f',
                  type: 'index-pattern',
                },
                {
                  id: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b',
                  type: 'index-pattern',
                },
                {
                  id: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c',
                  type: 'csp-rule-template',
                },
                {
                  id: '01629238-aea8-5737-a59b-45baf8dab404',
                  type: 'csp-rule-template',
                },
                {
                  id: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9',
                  type: 'csp-rule-template',
                },
                {
                  id: '02da047f-bc78-5565-86a0-e121850f76c0',
                  type: 'csp-rule-template',
                },
                {
                  id: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae',
                  type: 'csp-rule-template',
                },
                {
                  id: '05480064-f899-53e8-b8ad-34172b09b400',
                  type: 'csp-rule-template',
                },
                {
                  id: '05676b4e-3274-5984-9981-6aa1623c24ec',
                  type: 'csp-rule-template',
                },
                {
                  id: '05c4bd94-162d-53e8-b112-e617ce74f8f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '05f0c324-5c11-576f-b7a2-35ebf66f084b',
                  type: 'csp-rule-template',
                },
                {
                  id: '06161f41-c17a-586f-b08e-c45ea5157da0',
                  type: 'csp-rule-template',
                },
                {
                  id: '06635c87-1e11-59c3-9eba-b4d8a08ba899',
                  type: 'csp-rule-template',
                },
                {
                  id: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce',
                  type: 'csp-rule-template',
                },
                {
                  id: '08d850ca-c1be-57e2-ac39-5e38f8750cf6',
                  type: 'csp-rule-template',
                },
                {
                  id: '090923c7-e599-572b-bad3-703f768c262a',
                  type: 'csp-rule-template',
                },
                {
                  id: '0bdfe13d-7bc8-5415-8517-65114d344798',
                  type: 'csp-rule-template',
                },
                {
                  id: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861',
                  type: 'csp-rule-template',
                },
                {
                  id: '0e318770-7077-5996-afd8-27ca34fc5446',
                  type: 'csp-rule-template',
                },
                {
                  id: '1054ef6c-8f47-5d20-a922-8df0ac93acfa',
                  type: 'csp-rule-template',
                },
                {
                  id: '129b07b7-4470-5224-8246-6ae975d6304b',
                  type: 'csp-rule-template',
                },
                {
                  id: '1316108c-33a8-5198-9529-45716c5a87b1',
                  type: 'csp-rule-template',
                },
                {
                  id: '151312c8-7e97-5420-ac05-5a916b3c1feb',
                  type: 'csp-rule-template',
                },
                {
                  id: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d',
                  type: 'csp-rule-template',
                },
                {
                  id: '1706a986-39d7-5900-93eb-f191f6a40892',
                  type: 'csp-rule-template',
                },
                {
                  id: '17282e92-075f-593d-99eb-99346e4288ed',
                  type: 'csp-rule-template',
                },
                {
                  id: '1915b785-942d-5613-9a24-b40394ef745f',
                  type: 'csp-rule-template',
                },
                {
                  id: '1a8ee966-458a-5ff9-a6e9-436aba157ebd',
                  type: 'csp-rule-template',
                },
                {
                  id: '1b112bf6-61ad-5b08-888b-7b6c86b3526c',
                  type: 'csp-rule-template',
                },
                {
                  id: '1b89acc6-978c-57c3-b319-680e5251d6f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '1d0a20ee-ad20-5416-84c8-32c0f69b209b',
                  type: 'csp-rule-template',
                },
                {
                  id: '1d6ff20d-4803-574b-80d2-e47031d9baa2',
                  type: 'csp-rule-template',
                },
                {
                  id: '1e180f0d-3419-5681-838b-9247927eb0f6',
                  type: 'csp-rule-template',
                },
                {
                  id: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4',
                  type: 'csp-rule-template',
                },
                {
                  id: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36',
                  type: 'csp-rule-template',
                },
                {
                  id: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37',
                  type: 'csp-rule-template',
                },
                {
                  id: '213e2b33-f2b1-575b-8753-f239b278c25a',
                  type: 'csp-rule-template',
                },
                {
                  id: '23941040-0aae-5afd-bc8d-793742133647',
                  type: 'csp-rule-template',
                },
                {
                  id: '23e5f81e-ca05-53bf-8109-7e676feecee3',
                  type: 'csp-rule-template',
                },
                {
                  id: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9',
                  type: 'csp-rule-template',
                },
                {
                  id: '26ff6dff-042f-5901-8191-0e347d113e9e',
                  type: 'csp-rule-template',
                },
                {
                  id: '27896f4b-0405-5388-bacd-182e77556711',
                  type: 'csp-rule-template',
                },
                {
                  id: '27acd88e-c64f-5e9e-9cff-2de649f92ccf',
                  type: 'csp-rule-template',
                },
                {
                  id: '28f96eda-c94e-597c-aef0-0bceee085540',
                  type: 'csp-rule-template',
                },
                {
                  id: '29cefccd-77fe-5428-8bea-3fc1390d5d1e',
                  type: 'csp-rule-template',
                },
                {
                  id: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc',
                  type: 'csp-rule-template',
                },
                {
                  id: '2d0044e3-d235-5703-9c16-729932a0131e',
                  type: 'csp-rule-template',
                },
                {
                  id: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f',
                  type: 'csp-rule-template',
                },
                {
                  id: '328a73c3-011d-5827-ae86-4e323739e4e1',
                  type: 'csp-rule-template',
                },
                {
                  id: '33299b3d-68da-5604-8c62-62690fd40c49',
                  type: 'csp-rule-template',
                },
                {
                  id: '33a612ed-8dee-554d-9dd7-857bfc31a33a',
                  type: 'csp-rule-template',
                },
                {
                  id: '34a4790c-0214-5eec-b97d-1c11ffa6861e',
                  type: 'csp-rule-template',
                },
                {
                  id: '34b16c08-cf25-5f0d-afed-98f75b5513de',
                  type: 'csp-rule-template',
                },
                {
                  id: '34c9c662-5072-5195-835e-48da9be5047f',
                  type: 'csp-rule-template',
                },
                {
                  id: '368b52f8-b468-5fc7-9e47-b1b5e040e051',
                  type: 'csp-rule-template',
                },
                {
                  id: '374309b1-b87a-58bd-b795-1067d2e8ee9f',
                  type: 'csp-rule-template',
                },
                {
                  id: '3760ac17-de0b-537d-8e74-455d132d19d2',
                  type: 'csp-rule-template',
                },
                {
                  id: '37fc1edc-a59d-5e63-a530-d3d088195865',
                  type: 'csp-rule-template',
                },
                {
                  id: '3851b212-b300-545d-8d6b-54ef71c86661',
                  type: 'csp-rule-template',
                },
                {
                  id: '38535c6f-a478-5cbb-82de-9417a3968bd6',
                  type: 'csp-rule-template',
                },
                {
                  id: '394963fa-63fd-5e81-82eb-ea1b8dfacd53',
                  type: 'csp-rule-template',
                },
                {
                  id: '3afddcd1-b745-5b3c-8623-ce4abe6878b5',
                  type: 'csp-rule-template',
                },
                {
                  id: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c',
                  type: 'csp-rule-template',
                },
                {
                  id: '3cd971cb-cf64-51ef-875b-9a7787cd97cb',
                  type: 'csp-rule-template',
                },
                {
                  id: '3d701761-f9b6-5c2d-ab99-928161d2ebbd',
                  type: 'csp-rule-template',
                },
                {
                  id: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca',
                  type: 'csp-rule-template',
                },
                {
                  id: '3ef4430e-2829-576a-a813-edc766625ea9',
                  type: 'csp-rule-template',
                },
                {
                  id: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e',
                  type: 'csp-rule-template',
                },
                {
                  id: '40ab36e3-7438-5c36-afcd-bf5f5401366e',
                  type: 'csp-rule-template',
                },
                {
                  id: '421191d6-a13c-5c78-8c5b-102e1229655f',
                  type: 'csp-rule-template',
                },
                {
                  id: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c',
                  type: 'csp-rule-template',
                },
                {
                  id: '43d5538c-17a3-5e04-9c06-ad4323bfd188',
                  type: 'csp-rule-template',
                },
                {
                  id: '449bf7bf-8070-580f-a3aa-66bc7f94a721',
                  type: 'csp-rule-template',
                },
                {
                  id: '461c5ca2-0173-5b8c-ae36-b229cffefbb2',
                  type: 'csp-rule-template',
                },
                {
                  id: '47ee9344-791e-50e4-a266-ee2ebce093a7',
                  type: 'csp-rule-template',
                },
                {
                  id: '4931d684-a386-5545-b2c4-47b836e0149b',
                  type: 'csp-rule-template',
                },
                {
                  id: '49c71814-2dbe-5204-ad07-879a80503fbc',
                  type: 'csp-rule-template',
                },
                {
                  id: '49fe9df5-e86f-5981-ac24-dcaadadc2790',
                  type: 'csp-rule-template',
                },
                {
                  id: '4a130791-cdb3-5524-b45d-1f3df79e2452',
                  type: 'csp-rule-template',
                },
                {
                  id: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5',
                  type: 'csp-rule-template',
                },
                {
                  id: '4b11956d-7985-524e-900e-20405e2baaca',
                  type: 'csp-rule-template',
                },
                {
                  id: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45',
                  type: 'csp-rule-template',
                },
                {
                  id: '4cfe4df4-4157-53bb-820f-278fe02ec960',
                  type: 'csp-rule-template',
                },
                {
                  id: '4d0a1c5a-27b5-5429-895d-e90878fcce1d',
                  type: 'csp-rule-template',
                },
                {
                  id: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8',
                  type: 'csp-rule-template',
                },
                {
                  id: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1',
                  type: 'csp-rule-template',
                },
                {
                  id: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35',
                  type: 'csp-rule-template',
                },
                {
                  id: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc',
                  type: 'csp-rule-template',
                },
                {
                  id: '50da62ee-4099-5950-ba1e-984794749f28',
                  type: 'csp-rule-template',
                },
                {
                  id: '5133d843-d913-5c1c-930f-89560b828704',
                  type: 'csp-rule-template',
                },
                {
                  id: '5382994d-59e0-54d9-a32b-dd860c467813',
                  type: 'csp-rule-template',
                },
                {
                  id: '5411a1e9-a529-5512-b556-93178e544c9e',
                  type: 'csp-rule-template',
                },
                {
                  id: '551d3a0b-36f6-51c6-ba8b-0a83926b1864',
                  type: 'csp-rule-template',
                },
                {
                  id: '551e7bcf-b231-500d-a193-d0a98163a680',
                  type: 'csp-rule-template',
                },
                {
                  id: '555cf8d5-f963-5574-a856-e06614cf9341',
                  type: 'csp-rule-template',
                },
                {
                  id: '5cdc703f-54ea-5de6-97c4-9fdb495725ef',
                  type: 'csp-rule-template',
                },
                {
                  id: '5d7e7fce-64fb-5b7b-beeb-920496c2e333',
                  type: 'csp-rule-template',
                },
                {
                  id: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0',
                  type: 'csp-rule-template',
                },
                {
                  id: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ee4897d-808b-5ad6-877b-a276f8e65076',
                  type: 'csp-rule-template',
                },
                {
                  id: '5ee69b99-8f70-5daf-b784-866131aca3ba',
                  type: 'csp-rule-template',
                },
                {
                  id: '61ab077c-fc0f-5920-8bcf-ccc037a4139b',
                  type: 'csp-rule-template',
                },
                {
                  id: '62b717ac-bb8f-5274-a99f-5806dc4427a5',
                  type: 'csp-rule-template',
                },
                {
                  id: '64d37675-473f-5edc-882e-5b8b85b789c3',
                  type: 'csp-rule-template',
                },
                {
                  id: '64feecfc-7166-5d77-b830-bf4a8dd2e05d',
                  type: 'csp-rule-template',
                },
                {
                  id: '6588bb48-d02b-5169-a013-fe4dc115c709',
                  type: 'csp-rule-template',
                },
                {
                  id: '668cee84-c115-5166-a422-05c4d3e88c2c',
                  type: 'csp-rule-template',
                },
                {
                  id: '66cd0518-cfa3-5917-a399-a7dfde4e19db',
                  type: 'csp-rule-template',
                },
                {
                  id: '66cdd4cc-5870-50e1-959c-91443716b87a',
                  type: 'csp-rule-template',
                },
                {
                  id: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13',
                  type: 'csp-rule-template',
                },
                {
                  id: '67909c46-649c-52c1-a464-b3e81615d938',
                  type: 'csp-rule-template',
                },
                {
                  id: '68cfd04b-fc79-5877-8638-af3aa82d92db',
                  type: 'csp-rule-template',
                },
                {
                  id: '68f9d23f-882f-55d1-86c6-711413c31129',
                  type: 'csp-rule-template',
                },
                {
                  id: '69ffe7f6-bc09-5019-ba77-a2f81169e9de',
                  type: 'csp-rule-template',
                },
                {
                  id: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d',
                  type: 'csp-rule-template',
                },
                {
                  id: '6d58f558-d07a-541c-b720-689459524679',
                  type: 'csp-rule-template',
                },
                {
                  id: '6de73498-23d7-537f-83f3-08c660217e7e',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e339632-0d1c-5a7c-8ca3-fac5813932d9',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e46620d-cf63-55f9-b025-01889df276fd',
                  type: 'csp-rule-template',
                },
                {
                  id: '6e6481f1-5ede-552b-84e5-cceed281052a',
                  type: 'csp-rule-template',
                },
                {
                  id: '70f92ed3-5659-5c95-a8f8-a63211c57635',
                  type: 'csp-rule-template',
                },
                {
                  id: '71cd1aed-48f7-5490-a63d-e22436549822',
                  type: 'csp-rule-template',
                },
                {
                  id: '72bb12e0-31c0-54f4-a409-4aace3b602be',
                  type: 'csp-rule-template',
                },
                {
                  id: '737dc646-1c66-5fb6-8fcd-1aac6402532d',
                  type: 'csp-rule-template',
                },
                {
                  id: '741aa940-22a7-5015-95d5-f94b331d774e',
                  type: 'csp-rule-template',
                },
                {
                  id: '756e1a54-b2ce-56b9-a13f-17f652d7767c',
                  type: 'csp-rule-template',
                },
                {
                  id: '76be4dd2-a77a-5981-a893-db6770b35911',
                  type: 'csp-rule-template',
                },
                {
                  id: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100',
                  type: 'csp-rule-template',
                },
                {
                  id: '77d274cb-69ae-5a85-b8f6-ba192aee8af4',
                  type: 'csp-rule-template',
                },
                {
                  id: '7a2ab526-3440-5a0f-804c-c5eea8158053',
                  type: 'csp-rule-template',
                },
                {
                  id: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be',
                  type: 'csp-rule-template',
                },
                {
                  id: '7c908585-ec93-52dc-81bb-ceb17cd4c313',
                  type: 'csp-rule-template',
                },
                {
                  id: '7d1de53a-a32e-55c0-b412-317ed91f65e0',
                  type: 'csp-rule-template',
                },
                {
                  id: '7e584486-4d0f-5edb-8a64-7ee0b59333b8',
                  type: 'csp-rule-template',
                },
                {
                  id: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179',
                  type: 'csp-rule-template',
                },
                {
                  id: '80db9189-cd4d-572a-94dc-e635ee8af7fa',
                  type: 'csp-rule-template',
                },
                {
                  id: '81554879-3338-5208-9db3-efb2a549d38c',
                  type: 'csp-rule-template',
                },
                {
                  id: '8233dcc7-c6af-5110-b7d4-239a70d7bed5',
                  type: 'csp-rule-template',
                },
                {
                  id: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4',
                  type: 'csp-rule-template',
                },
                {
                  id: '84862c2c-4aba-5458-9c5f-12855091617b',
                  type: 'csp-rule-template',
                },
                {
                  id: '84b8b7be-d917-50f3-beab-c076d0098d83',
                  type: 'csp-rule-template',
                },
                {
                  id: '84c7925a-42ff-5999-b784-ab037f6242c6',
                  type: 'csp-rule-template',
                },
                {
                  id: '873e6387-218d-587a-8fa1-3d65f4a77802',
                  type: 'csp-rule-template',
                },
                {
                  id: '875c1196-b6c7-5bc9-b255-e052853c3d08',
                  type: 'csp-rule-template',
                },
                {
                  id: '87952b8d-f537-5f8a-b57b-63a31b031170',
                  type: 'csp-rule-template',
                },
                {
                  id: '882ffc80-73e9-56aa-ae72-73b39af6702f',
                  type: 'csp-rule-template',
                },
                {
                  id: '88634421-e47c-59fb-9466-a86023f20dd5',
                  type: 'csp-rule-template',
                },
                {
                  id: '88734e31-d055-58ba-bf70-7d40d0b4e707',
                  type: 'csp-rule-template',
                },
                {
                  id: '89a294ae-d736-51ca-99d4-0ea4782caed0',
                  type: 'csp-rule-template',
                },
                {
                  id: '89b58088-54f6-55dc-96a3-f08ac4b27ea3',
                  type: 'csp-rule-template',
                },
                {
                  id: '89cc8ff0-be81-55f2-b1cf-d7db1e214741',
                  type: 'csp-rule-template',
                },
                {
                  id: '89ebec6b-3cc4-5898-a3b9-534174f93051',
                  type: 'csp-rule-template',
                },
                {
                  id: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a',
                  type: 'csp-rule-template',
                },
                {
                  id: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2',
                  type: 'csp-rule-template',
                },
                {
                  id: '8d3f2919-da46-5502-b48b-9ba41d03281b',
                  type: 'csp-rule-template',
                },
                {
                  id: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75',
                  type: 'csp-rule-template',
                },
                {
                  id: '8f2644ed-70b5-576f-b9b9-aabea6821749',
                  type: 'csp-rule-template',
                },
                {
                  id: '8f88e7f7-6924-5913-bc18-95fcdc5ae744',
                  type: 'csp-rule-template',
                },
                {
                  id: '900567f0-4c2f-543a-b5cf-d11223a772a2',
                  type: 'csp-rule-template',
                },
                {
                  id: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3',
                  type: 'csp-rule-template',
                },
                {
                  id: '9126cd85-611c-5b06-b2f2-a18338e26ae1',
                  type: 'csp-rule-template',
                },
                {
                  id: '919ef7a7-126c-517e-aa35-fb251b1ad587',
                  type: 'csp-rule-template',
                },
                {
                  id: '91d52d43-da61-5ba2-a4d4-1018fee84559',
                  type: 'csp-rule-template',
                },
                {
                  id: '92077c86-0322-5497-b94e-38ef356eadd6',
                  type: 'csp-rule-template',
                },
                {
                  id: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d',
                  type: 'csp-rule-template',
                },
                {
                  id: '9259a915-0294-54d6-b379-162ceb36e875',
                  type: 'csp-rule-template',
                },
                {
                  id: '9272d2b5-4e25-5658-8a6c-d917f60134ec',
                  type: 'csp-rule-template',
                },
                {
                  id: '92ab0102-d825-52ce-87a8-1d0b4e06166c',
                  type: 'csp-rule-template',
                },
                {
                  id: '933268ec-44e8-5fba-9ed7-535804521cc7',
                  type: 'csp-rule-template',
                },
                {
                  id: '934583bd-306a-51d9-a730-020bd45f7f01',
                  type: 'csp-rule-template',
                },
                {
                  id: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c',
                  type: 'csp-rule-template',
                },
                {
                  id: '93808f1f-f05e-5e48-b130-5527795e6158',
                  type: 'csp-rule-template',
                },
                {
                  id: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e',
                  type: 'csp-rule-template',
                },
                {
                  id: '94fb43f8-90da-5089-b503-66a04faa2630',
                  type: 'csp-rule-template',
                },
                {
                  id: '94fbdc26-aa6f-52e6-9277-094174c46e29',
                  type: 'csp-rule-template',
                },
                {
                  id: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b',
                  type: 'csp-rule-template',
                },
                {
                  id: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a',
                  type: 'csp-rule-template',
                },
                {
                  id: '9718b528-8327-5eef-ad21-c8bed5532429',
                  type: 'csp-rule-template',
                },
                {
                  id: '97504079-0d62-5d0a-9939-17b57b444547',
                  type: 'csp-rule-template',
                },
                {
                  id: '9a0d57ac-a54d-5652-bf07-982d542bf296',
                  type: 'csp-rule-template',
                },
                {
                  id: '9a9d808f-61a9-55b7-a487-9d50fd2983c5',
                  type: 'csp-rule-template',
                },
                {
                  id: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb',
                  type: 'csp-rule-template',
                },
                {
                  id: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f',
                  type: 'csp-rule-template',
                },
                {
                  id: '9c2d1c63-7bf3-584d-b87a-043853dad7a4',
                  type: 'csp-rule-template',
                },
                {
                  id: '9ce2276b-db96-5aad-9329-08ce874c5db6',
                  type: 'csp-rule-template',
                },
                {
                  id: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b',
                  type: 'csp-rule-template',
                },
                {
                  id: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fb9a46f-de59-580b-938e-829090bd3975',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b',
                  type: 'csp-rule-template',
                },
                {
                  id: '9fcbc87c-0963-58ba-8e21-87e22b80fc27',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a1f327c0-3e4b-5b55-891a-b91e720cd535',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a22a5431-1471-534c-8e7c-1e16fe0a857c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a2447c19-a799-5270-9e03-ac322c2396d5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a501efd2-73b9-5f92-a2c7-fa03ae753140',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a52c1d16-d925-545d-bbd9-4257c2485eea',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a6074b1d-e115-5416-bdc5-6e1940effd09',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a7c6b368-29db-53e6-8b86-dfaddf719f59',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a97eb244-d583-528c-a49a-17b0aa14decd',
                  type: 'csp-rule-template',
                },
                {
                  id: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba',
                  type: 'csp-rule-template',
                },
                {
                  id: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11',
                  type: 'csp-rule-template',
                },
                {
                  id: 'aa4374f0-adab-580c-ac9d-907fd2783219',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'abc6f4b4-3add-57c4-973d-c678df60804c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ad4de26d-02a8-5202-b718-48147bf0fd03',
                  type: 'csp-rule-template',
                },
                {
                  id: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b0a70444-c719-5772-a8c1-2cd72578f8ee',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b190337a-56a7-5906-8960-76fd05283599',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b1b40df2-f562-564a-9d43-94774e1698d1',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b287617d-7623-5d72-923d-e79b1301e06c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b2909440-5ad0-522e-8db0-9439d573b7d5',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b4133ca4-32f1-501e-ad0a-a22700208a4f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b449135c-8747-58fe-9d46-218728745520',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b5493b70-e25f-54e6-9931-36138c33f775',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b64386ab-20fa-57d2-9b5b-631d64181531',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b794635d-a338-5b4e-bfa0-75257e854c6a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b8c40039-034b-5299-8660-a7c8d34efe36',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b8f1182a-1b3e-5b08-8482-f74949163e97',
                  type: 'csp-rule-template',
                },
                {
                  id: 'b96194c6-8eb7-5835-852d-47b84db83697',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ba545cc3-f447-5d14-8841-d3d3c05024e8',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bb264405-de3e-5b91-9654-2056f905fc67',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961',
                  type: 'csp-rule-template',
                },
                {
                  id: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'be1197db-90d0-58db-b780-f0a939264bd0',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c0ef1e12-b201-5736-8475-4b62978084e8',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c1e1ca12-c0e2-543e-819d-22249927d241',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c28e606d-f6a7-58b2-820f-e2fb702bf956',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c2b36f84-34b5-57fd-b9b0-f225be981497',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c2d65e60-221b-5748-a545-579a69ad4a93',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c40bebb5-5403-59d8-b960-00d6946931ce',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c43a57db-5248-5855-a613-2a05d0a42768',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c444d9e3-d3de-5598-90e7-95a922b51664',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c455dba0-a768-5c76-8509-3484ec33102f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c52e86bd-55f1-5c6a-8349-918f97963346',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c53dab24-a23f-53c6-8d36-f64cc03ab277',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c8a8f827-fba6-58ee-80b8-e64a605a4902',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c8f24be5-fd7d-510f-ab93-2440bb826750',
                  type: 'csp-rule-template',
                },
                {
                  id: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cb57543f-5435-55b5-97cf-bda29ec9094a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72',
                  type: 'csp-rule-template',
                },
                {
                  id: 'cda5f949-378c-5ef6-a65e-47187af983e4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd1d73385-2909-598a-acf7-bf1d8130f314',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd248e880-7d96-5559-a25c-0f56c289a2e7',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd303c4f1-489c-56ca-add9-29820c2214af',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd3d725bd-652f-573e-97f5-adfd002fab8e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd498d11f-6c2a-5593-b6c6-6960b28da84e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd57d6506-a519-5a29-a816-b1204ebfef21',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a',
                  type: 'csp-rule-template',
                },
                {
                  id: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dafb527b-9869-5062-8d38-c9dced4a27c2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'db28165f-6f7c-5450-b9f3-61c7b897d833',
                  type: 'csp-rule-template',
                },
                {
                  id: 'db58a1e4-de58-5899-bee8-f6ced89d6f80',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dfc17731-aa8f-5ecc-878b-113d1db009ca',
                  type: 'csp-rule-template',
                },
                {
                  id: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e073f962-74d9-585b-ae5a-e37c461e9b7c',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e1b73c05-5137-5b65-9513-6f8018b6deff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e2306922-4f95-5660-bf2e-9610f556de69',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e24bf247-bfdc-5bbf-9813-165b905b52e6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e3c6b85b-703e-5891-a01f-640d59ec449e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e570dc22-4f5d-51db-a193-983cb7d20afe',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab',
                  type: 'csp-rule-template',
                },
                {
                  id: 'e92ddce9-3cba-5e3d-adac-53df0350eca0',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ea3378aa-250e-50d8-9260-ff8237cf09a2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eda32e5d-3684-5205-b3a4-bbddacddc60f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ede1488a-e8cd-5d5f-a25d-96c136695594',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eeb00e89-7125-58e8-9248-b9f429583277',
                  type: 'csp-rule-template',
                },
                {
                  id: 'eed3e284-5030-56db-b749-01d7120dc577',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005',
                  type: 'csp-rule-template',
                },
                {
                  id: 'efec59bf-4563-5da7-a1db-f5c28e93b21f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f00c266c-0e28-5c49-b2b0-cd97603341ec',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f44d0940-2e62-5993-9028-d3e63ae23960',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f507bb23-1a9d-55dd-8edc-19a33e64d646',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f512a987-4f86-5fb3-b202-6b5de22a739f',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f55af438-f955-51d3-b42f-60b0d48d86e4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f9344da7-b640-5587-98b8-9d9066000883',
                  type: 'csp-rule-template',
                },
                {
                  id: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fb4368ab-cdee-5188-814c-a8197411ba22',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fb8759d0-8564-572c-9042-d395b7e0b74d',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fcc4b1b4-13e6-5908-be80-7ed36211de90',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fe083488-fa0f-5408-9624-ac27607ac2ff',
                  type: 'csp-rule-template',
                },
                {
                  id: 'fe219241-4b9c-585f-b982-bb248852baa1',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077',
                  type: 'csp-rule-template',
                },
                {
                  id: 'ffc9fb91-dc44-512b-a558-036e8ce11282',
                  type: 'csp-rule-template',
                },
              ],
              installed_kibana_space_id: 'default',
              installed_es: [
                {
                  id: 'logs-cloud_security_posture.findings-default_policy',
                  type: 'data_stream_ilm_policy',
                },
                {
                  id: 'logs-cloud_security_posture.findings-1.9.0-preview04',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities-1.9.0-preview04',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-cloud_security_posture.findings',
                  type: 'index_template',
                },
                {
                  id: 'logs-cloud_security_posture.findings@package',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.findings@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities',
                  type: 'index_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities@package',
                  type: 'component_template',
                },
                {
                  id: 'logs-cloud_security_posture.vulnerabilities@custom',
                  type: 'component_template',
                },
              ],
              package_assets: [
                {
                  id: '6c67c2ff-1c6e-502b-b7df-d4aed729b404',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c9d77a3e-a19a-5a8c-8efa-29210cbfb45f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7d6dd123-3d48-535e-948d-9a1d57f7fb04',
                  type: 'epm-packages-assets',
                },
                {
                  id: '251376a1-999a-5c58-a16a-332e9b93cd20',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de81d4e3-cf3e-53fc-9a98-6c9ea7e0f4f5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0058332a-7d34-5538-b2e3-1799fee177f6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c968afe0-4691-5a55-9df6-63ccca93b962',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0e559a63-e86c-5f38-a148-1e290adf8f0c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f1194836-e317-58c1-9bbd-869e771e0bff',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e2393e1b-6bb2-5a7c-9025-60b261b14ff3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '24c048df-d5f0-51f4-941a-c8ed49a121ba',
                  type: 'epm-packages-assets',
                },
                {
                  id: '936ae162-1f6b-5107-a62e-df3a41d080a0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '18c04730-10da-50d5-9c82-3a3c91edb2b3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7172fb5b-dd51-5ab2-8e7f-9a2b68f5d25c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '81bdd27f-58db-5baa-b3c4-0c2971711af7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7d84cdbd-9cb8-5f55-b5dd-2f0c1ee2685f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '26261d50-15b4-573b-be15-0191777bf633',
                  type: 'epm-packages-assets',
                },
                {
                  id: '97c0aa5a-b34f-5ba4-b694-b6183d631b8a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6a54a6f7-fa7a-53a0-bf34-dba476486044',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c18fba7f-a8a7-550d-9809-9de2f9988d15',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5137c9ce-dd2d-5f45-b7a1-86cfedfdf761',
                  type: 'epm-packages-assets',
                },
                {
                  id: '24b875e6-e24a-5870-8e11-a5e687a8c345',
                  type: 'epm-packages-assets',
                },
                {
                  id: '95940d7c-ab53-5ab6-a859-3e8a8e4c4cb9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c84cf1d6-d1ae-5cfa-9c30-051db89051ce',
                  type: 'epm-packages-assets',
                },
                {
                  id: '556fb842-5f49-5a74-9371-011e65fadc0c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a93ba572-4309-5d29-89a1-f67d9639d8a3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c97ace33-b843-5e68-9ec1-2eb92cf77209',
                  type: 'epm-packages-assets',
                },
                {
                  id: '287a331b-5c7a-5a52-9d21-d80d927e004a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '78c46ab0-f847-5787-90ab-5d487e802154',
                  type: 'epm-packages-assets',
                },
                {
                  id: '700a8c26-a92a-5305-88a3-48991a32c780',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c72cd88e-b692-5dd5-a1f6-6b598af71e0a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c33205e8-4b05-5a14-93a9-99c06b1e3ecb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a13bb712-6ec5-5f9e-a6ef-caa310b24860',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3692f463-a54b-5e3b-8f8f-df00a2a1de50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f3f8282-c0d0-5972-9db5-847290e0c472',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0382d885-8a6a-58d2-bca1-785259aee70d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b49519bd-cb20-5dcf-b388-7619c697a9af',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98aab00f-a323-5176-9d12-960ab0dd366a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '63436911-ece8-5f22-92dd-1b26c73e2913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35b74f54-ed07-56a9-be20-454cc7095221',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0f1e7ff2-e694-5266-a276-f9a9e4b2f82b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a4fd9648-c7d1-5e1a-997d-a20b43b2cbd8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1a798101-4fbd-52f8-91ab-ee6ce3f30c35',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b5b41185-d6cd-5376-9fac-f8488c2a86d2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '05ba9b33-ddd9-52dd-85af-36f2ae393cdd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f503b25f-56d5-524a-b961-aaa9fb982768',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5deb3ade-fd8b-59f2-95a4-b5b3dded9e50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4db8aa0f-057b-5737-9a5d-dd9605fa824a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c413adb4-acd6-5d4a-bcfa-d8468b9eed6a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f6078ee-beba-5a4f-aa4b-cc2f6dbb6880',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e5fe01ed-7609-5dc1-baf7-12b1fe8ab40b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a5ab9a4b-7f4b-5b25-9857-674d756543b8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '60b2e324-010a-5ccc-bcd7-85206a6828b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd998cd45-47e4-51c1-97eb-750703db8791',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bfd12812-5020-543f-9ea8-37da89dfcf0a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '60a4ddb0-c9ad-5218-87f9-be04b1abfffc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b571789f-9ad4-543c-83db-2e169167e078',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c1a18561-75a0-5057-b9de-a3a59383b67d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'efc93b14-6b30-55b5-86ef-01f15fa8573f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0a838743-1d6c-57eb-b69e-c7a9049be5cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ef15777f-1ce7-532f-8580-60754401476e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f48ba41e-768b-549d-8a37-606330662521',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ea42b013-3233-5e90-895a-944c39f12591',
                  type: 'epm-packages-assets',
                },
                {
                  id: '37dd8651-4bb4-59d6-b627-b4b80926b283',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7f04250c-e782-5544-8dfa-f85eab593a9a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2f64482c-dfae-54b3-aab2-1a409a696efa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '55aa37aa-8d70-5ee1-af15-ec272054b278',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3665b5e4-1a2a-5141-ad4f-f4b8d57f5826',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c880d19-7341-57aa-a49f-7a9f4ac10521',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9d199a97-8680-55ba-873e-2455c2fe9915',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fe778031-b235-5277-bdd3-8fd5bd1afe82',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cf9f8f6a-f9f0-578f-a8bf-a4d16157abd1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0234baac-ae13-5b8d-a169-81f9d294d7ac',
                  type: 'epm-packages-assets',
                },
                {
                  id: '737ff338-bf97-5323-a385-66e2a49e5fa6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '373a7bbc-d11f-57f5-80df-3d7083cd2ed7',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de50e36b-828b-5516-a172-b267f1a2112f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5a5659b5-f07c-5b0d-b458-a778cf4d9493',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fb6e4b1e-3d8f-5784-9322-fb5eb2566df4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '62789ad7-a927-505d-b216-822a1e9401c5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4b43b3e1-8ee0-547f-9e09-2a81815107fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3321336b-5bf0-512f-996f-b556108ad50b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1455fe35-71b3-5205-aec9-441a37683fd1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e82b2b7-65a2-57fa-aeef-59899e78952c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0b360047-92e3-5b7b-a35d-13ba06575789',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f326b361-8416-5eba-8654-ff47658c49a8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5a2900c9-a03d-53b6-bb11-34c364b8553f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f14f2707-00ed-5e4e-bab0-acca2932988b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c55455ce-e4c7-5a0f-bae1-8b39fa598282',
                  type: 'epm-packages-assets',
                },
                {
                  id: '48b4b8fb-48b3-5411-860e-f40b967e657c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2f8fd7e3-393e-5ed1-aa7b-8167b5b9f913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '13108afe-fc03-5c62-865f-be72d3eeec93',
                  type: 'epm-packages-assets',
                },
                {
                  id: '885e3e1d-b894-5e51-b45c-119aea1b84f8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '88624517-af46-59e1-8fd1-bab876bb9df3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e534f997-4a33-5d4e-b4b8-ac5d606c1a84',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4bc97420-edda-5b5d-ae5b-9ed10540a613',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3125eb5d-01d8-59cf-8006-8df09282bcd4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '26b50f35-c045-5247-8251-2760cebab05f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09b21fe2-e280-5319-802c-79c6d12b293b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b6284126-8789-515a-bb2d-0d1b77d19179',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2cf19643-fa43-59c9-bd18-9c9037d08b51',
                  type: 'epm-packages-assets',
                },
                {
                  id: '99b524df-21cf-5529-a3d6-0d901f7d743b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'def4879d-7555-5593-b2f4-138bcfb89776',
                  type: 'epm-packages-assets',
                },
                {
                  id: '85aa0aeb-e6c3-54e8-9dce-a86d2c4e4216',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c73a148-cbff-5b93-a2a0-5f4888565904',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e7a0e733-b3c1-5226-b1ae-b29053ba3b5f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '646c2db9-4a8d-5329-8450-26e3678abbf7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '798d35d0-a301-5d06-9988-f90d5d7c7769',
                  type: 'epm-packages-assets',
                },
                {
                  id: '27705163-a242-5c9d-98d2-cbd1d7dc9913',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9c51c060-18ee-52c4-ab53-4f9e12101741',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e77da34-18fd-5317-b269-bad95bd34b04',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6b506869-3032-58e0-a8f7-d59daeefae13',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c96bd10-7b67-500e-9ef3-2c0381bfa91e',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9bd90bbc-697a-5ff2-9801-f47a02f70a24',
                  type: 'epm-packages-assets',
                },
                {
                  id: '496514fa-ea74-5a9b-9272-8d9ce856687f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd8ffeadf-0501-560b-86ef-b41e9e0e3b7b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5fdb0448-d776-5f1b-9317-2bd9fb3cfffb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fffca49b-479c-557e-94b3-73b45ba7c1f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3913c2ab-212a-5d24-bedb-22f6f0e26186',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c72ea62c-b283-5bed-b932-6805a83fa52c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0871445a-03c8-5701-910d-861999c0df5b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '67e7fea4-fa50-5a36-b1bd-1267eca4082a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '61981457-7dff-50bd-92cd-80b3e832699d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2213e8fe-2a5a-5ed8-b426-98dd14c84261',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f4882d1d-aa6a-5da2-9612-4862ba13c1b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fc2c1038-97cd-5f89-b540-7629991fa216',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'afa7f0de-123f-5232-82e5-7e03507c3248',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35e4af4a-7ac8-5038-b73f-bf187b17f6eb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a64f3661-46a3-5db8-9d9d-b594c4df423d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '85cfc1a7-edf4-569a-abcb-5ef86c338019',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2ebcbca2-6552-59ee-bfdf-844083fa92ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '907c831c-4326-55b9-a9b3-b98028c5b219',
                  type: 'epm-packages-assets',
                },
                {
                  id: '68a5e71d-3f99-5d9a-bc28-a59e5d90bd9a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a4f9d960-dd5d-53b0-82fc-a64684b380d4',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd534d71a-b733-5ce1-b522-f7a75c0b3271',
                  type: 'epm-packages-assets',
                },
                {
                  id: '92677ec3-039a-5bca-b56c-2337fd0b7e64',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bbca04ee-79a1-5f82-8ded-fd4a902886d0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2a3652a0-8eed-5a2c-b2b1-a9ca96f589bb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f4c23e6-88b8-5795-a09b-b2c32879492b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f9eeb0f1-237a-54e8-b672-712104182ae6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '97bc9a09-7926-590f-897c-772c973cb35b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bcad896c-ad50-5236-b098-795c7c50b2dd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '86e7b03d-c5fa-5a2d-8d4d-2544bf69eb2e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cfa682ad-99a7-57ed-9a0a-b8f3b8aa173d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2109aef8-b158-52f1-86a2-0061363530ac',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd29fca21-f127-5f14-a5b8-ca1c5dd8d3cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ca8cecf6-5ef2-566f-bb39-b1b7fabacdae',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2d1f5109-8914-5e3a-9b70-0e9904a29067',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1e60d776-c44c-56af-bc32-50cbed228d44',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b2b985d1-aabd-57af-9f8e-e67317bb118d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b147313-ea4f-537f-91e3-1543d517ee95',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e2ae868b-ff6c-5702-b15a-5e6e3d5078aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '46408db9-4c57-544b-9cb2-0513780ef44f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4d794d07-58ca-58f7-9cb5-ec35c6a8a1e5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8ff8219e-0f39-5b0a-a85a-09d6525d5c4c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd5016250-092c-55a0-a516-10cef385bc92',
                  type: 'epm-packages-assets',
                },
                {
                  id: '62855857-66bf-5b58-add0-213ae5ccfe43',
                  type: 'epm-packages-assets',
                },
                {
                  id: '133607eb-1322-54fc-886d-44389c9f1222',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9ded7ca5-d65f-5f3b-92c3-1341eab9c9fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98bbe91a-dd3d-58a4-b211-f5f6556bc0cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5d896f47-421f-53d6-8aa7-d717a539e6fc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd7985b56-9c10-5433-aece-b8543f720e6f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f43c5a86-aea6-5901-b69e-7782d942edf6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '830cd395-da1a-5d6d-a1df-b31ee564efc6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '36db99c5-f92f-53d2-80ee-5337423c6c74',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f4c7e04-743a-5537-afc9-6395f3e71622',
                  type: 'epm-packages-assets',
                },
                {
                  id: '80667605-6df9-5dac-a90e-e9ce199a93e3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7aac4803-44a2-58a9-b89d-3bd28891ca32',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9409357d-a366-5b81-87b7-322b83f01a02',
                  type: 'epm-packages-assets',
                },
                {
                  id: '36440c61-e18c-56bc-93e4-955a98a9d515',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ffb529d6-ea9f-5dbd-bbab-25dc66ccaf8e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c6657406-dde4-5e52-a8c2-2dcb67591933',
                  type: 'epm-packages-assets',
                },
                {
                  id: '19535ecd-2672-53a9-982f-a479c91da3aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'baa41f5e-5fc0-5e57-a8c6-368bc2da8999',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'caa5c47e-8e8e-5a95-9841-d0ded08c8cf7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '650573f7-7fa1-58b8-814d-fc16da830abe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a3a6654-f5ae-58a9-9934-39ee5c0e6a36',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e25e52e3-b954-500b-88ee-a64f15eb9e06',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1c454c96-048b-5923-8373-d31d759c1957',
                  type: 'epm-packages-assets',
                },
                {
                  id: '01264f04-c643-5af3-8bc7-6ccd77139d2a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '628de269-a153-51d0-9897-986b367cac73',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0b568d99-e250-5303-911c-d5df0d7f957e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f5cf4600-ac2a-537a-ae7a-3bd2326c8218',
                  type: 'epm-packages-assets',
                },
                {
                  id: '44b8d605-b7b7-589c-a788-0ba1b75212ed',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9123b1ca-cf76-564d-aee8-7831a81044ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2de37832-710a-59f9-8fc3-773d61f962ad',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c7922bab-bafd-5539-810c-659893ca180c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4d2aa753-063d-5493-b0fe-b51eadec0d19',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09782f0a-e962-5d6a-a60d-799ac791b6a4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '844c1957-93fd-56df-909a-798f2917b536',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5c3a7e80-9c6f-5142-8bd6-1dab4d23038d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2ead9e25-b8ba-5dc6-bbe8-1f0327dfe46f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '83b0a25d-de47-5129-96ea-b056bf1d2c19',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd9c65ab0-c815-5e55-8c39-2be0339e7990',
                  type: 'epm-packages-assets',
                },
                {
                  id: '782dcf8c-2eee-542a-8b98-40b2d0c60fbb',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f492a863-d71f-54bd-bbbc-1c640c794699',
                  type: 'epm-packages-assets',
                },
                {
                  id: '65fda65a-dd24-568c-b0d8-95eb1da93137',
                  type: 'epm-packages-assets',
                },
                {
                  id: '45c8eadb-19e7-5ac7-a432-f3ac44ba35cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e5da09f6-3e57-5795-a3aa-bc74fa800333',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e1a0aaa9-8cfb-536b-866d-96f054ed2ea7',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dbb328c3-e93f-5f33-97ab-3d7e691df818',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c2204072-4b1b-59e4-a390-eab957af67fb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c402923-b995-549e-90a3-ae112dc89c0d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'df392617-b554-5aac-a980-0bcc0cc6bc15',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5486b6f5-6952-5dea-ba57-a350c6cf951d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c27ae676-affc-570f-ba89-1690c5f17fc5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '727fa13f-3ce2-5192-a861-5b3de0e84edd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3cf1f6bf-b282-5072-8aca-9ebafbfc6b16',
                  type: 'epm-packages-assets',
                },
                {
                  id: '923ee008-55f6-51a1-95d7-f2bd5a7b05da',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b1834cca-2958-5c27-93a9-f53e87d429ec',
                  type: 'epm-packages-assets',
                },
                {
                  id: '602c5069-f300-5726-b181-d4ce5a67d976',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e76b30a0-c661-5bcb-9024-4ae2e51087cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: '425bd0bf-a2a0-525b-8764-12fc59081564',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd41f1cbc-7803-558d-9300-fa5c3401f2eb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '15b1b69b-b4eb-579b-9def-c654dc213052',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1db4fef3-e17a-5cdd-bd25-49f5e65a8c6c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a430d606-aef6-5284-8cbe-55e72e581f24',
                  type: 'epm-packages-assets',
                },
                {
                  id: '56554ff2-69e1-5eb5-815f-e6662ce9a70b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f0328d22-3b60-529e-b6fb-dcad250c1358',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ba6d7cd1-78e7-578e-b82c-c5ad2dad34aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '07dd07a6-381a-5615-b44b-c5771e5af17a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ae3f5fe2-055e-5a5d-baa1-2f91c854016e',
                  type: 'epm-packages-assets',
                },
                {
                  id: '456992e7-cb48-514e-9370-ff95ef1e4dc6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1ac0b2f9-a357-53aa-a5d2-b35ce090f16c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b2283d25-3935-5061-836c-5beb5ce23c1b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '35e6fdfa-a4ba-5dcf-bf3f-ff472e2c6fda',
                  type: 'epm-packages-assets',
                },
                {
                  id: '071d9980-a001-5ec6-8b91-899696bb4c83',
                  type: 'epm-packages-assets',
                },
                {
                  id: '05f17419-b4e7-5543-acb5-35c4810ec301',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dc238334-77d8-54fd-97b5-0aa6b50dc15b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '63c9b90b-3506-5a2a-a8d7-25bee54c5642',
                  type: 'epm-packages-assets',
                },
                {
                  id: '61acbf67-050f-506f-8fff-d9893e963f21',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6b83cba9-eca4-51e9-8fac-d782892cdf52',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd989a2c5-6219-5d54-a234-5f71a0cf384f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '76a85a8e-2b90-52b9-920b-cd70d43f33d1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6e5a5a24-fe86-564e-8096-12b9fda3e3bb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3a3944cd-5413-5611-b0ea-8d64d911e763',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ee9a4369-8ecf-5cff-ab8a-6caeb55ae1ff',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3ee85b6e-c043-5d2a-b6ff-87c4dfb29e02',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'df45efd7-ec8c-5a0c-bbab-40dcf4af183c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5b4de166-a4f4-5c1f-940a-777676e49194',
                  type: 'epm-packages-assets',
                },
                {
                  id: '879018d5-c983-5171-95f0-d281091fd45c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '86fcf7bb-d363-58f3-a30e-0b0e7a567b5a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '664f70da-70fd-5ab0-ab15-f6bd412c4ec8',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c1300b66-1d00-5053-a217-0fa1905e0b50',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0e502662-9005-5d7c-b33f-82f0aed11767',
                  type: 'epm-packages-assets',
                },
                {
                  id: '395b5024-8124-512f-8d3a-ab20d6f678c6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '482d8420-b2a6-5986-a63a-68994aa696b9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5be1a44d-de60-5073-9ac3-ac1c806b2174',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b183f8f7-cc02-5aae-9f9e-93c967312fb5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9203d6b4-58bc-55f7-90a6-715c61978e00',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e62cd52b-8aa2-5478-948a-0af769cfa3f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8dd1b802-a8a1-549c-9882-5a387616278e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b62e071b-1330-5da7-93be-13f26b2490ce',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'de32eec9-6826-5710-9871-ee5d3f05daf3',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0461288e-4f7c-592b-8d6e-6d21b4005122',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd037eebb-5669-5346-96b9-07bf0aea5aa3',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd992521e-3da2-5ef2-a9af-c81ae0daafd0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9237fa3c-7cee-5d0e-b8ab-e91f516bebf0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '419ed61e-79be-5b2a-830d-84b60ce399cd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '75ddd649-12fd-5abe-b01c-9c0bb59cb599',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'eb101bca-21fc-590a-92ed-6356669871c5',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2b8da506-442c-547e-889d-91ce1d06719a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b5246a9-c55f-508d-8131-171e18db4df1',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9323106b-f76f-586d-bcce-ba79222539a8',
                  type: 'epm-packages-assets',
                },
                {
                  id: '80cfbb1a-17b2-5560-9e01-222b0190413a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7ceeada4-9e86-59a6-92c5-00ad972a18fe',
                  type: 'epm-packages-assets',
                },
                {
                  id: '477f7a3a-1b7d-53fa-ae52-f878233a59e6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1dce55af-7048-57a0-9452-697aa86af619',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ced85372-ac57-5161-8447-a7fcb8fff146',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bcc5e2e4-58e7-5e11-9bbd-115ff8d152c4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a3a1942-3690-56b5-9fbe-814251242a7c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6da3f3a1-253c-58ef-8e7c-2f25bbe052cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd18811ee-dab9-5a7e-aa8c-a6612c9cf97e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'feb02a30-aee8-5b60-b82d-cfcc37ab5e33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '54269949-2d97-58c9-ac30-03a7d7fd17f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fb361929-6336-550b-8c49-f5d2985d5ca2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '98c52f15-4177-500c-92e7-3a0d6f1cc929',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6cf5588f-9117-5db1-bfe4-18ac1b011a10',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5093daf6-13ce-5eb6-893b-0d177cd33e62',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd34132d6-1697-5133-929e-c7cc62cab031',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ec1c5fcb-41ed-5d7c-bcea-7012590b001d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f483f0a6-fb36-57d4-be8e-23ff3ad279cc',
                  type: 'epm-packages-assets',
                },
                {
                  id: '04593bf8-d735-56f5-bc96-0b67c98bf950',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ab5299c8-8f21-5ddc-b413-288e46dcdf02',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a579c235-bb6d-5a49-9430-57a254a6542c',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a8aed8cc-d807-5451-88cd-6b567f3694a6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5af174a8-3952-5923-b11f-375433bf29d6',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4cb8fbb9-7ba8-5397-911b-48c6f1be7ecf',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1ebfa0f1-1b9c-505c-b1f4-b5ed344679c0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6f177390-9379-5e80-9103-640475177768',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'be0a7876-e648-57d7-8762-0c7b8aed9242',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e57ea19f-a7cb-5476-a24a-f3832b42c5fd',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0d7be804-70be-5f57-b498-0aa9d7491763',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a0838187-fd36-5914-884d-64d1098b9d6e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a6925653-2de4-53a6-95d6-e29dfeafe489',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0fa9f244-3919-5a86-8bd1-df68c24dc196',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cf67b6d6-90f8-5a8d-9bcc-ccb25f482f89',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ca76c39d-e335-528c-b1ef-31fc269d7e5f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a6480759-0753-53b0-8b56-ef7f697a16af',
                  type: 'epm-packages-assets',
                },
                {
                  id: '962c662d-8660-5631-8f17-5d14da9e353d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ea5c3b39-31b5-50f9-8bf3-398b47c1d196',
                  type: 'epm-packages-assets',
                },
                {
                  id: '42759e10-93ec-53c9-95cf-6a0a6091a96e',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c7ad9b7c-00d6-51aa-94c5-1d74be48764a',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2bc3ca32-343a-5740-8d24-14e683d75f33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1b4366ab-f71a-59ae-8db8-1696c3b23b33',
                  type: 'epm-packages-assets',
                },
                {
                  id: '47d641a9-f42c-57e8-96a6-f4054b22dca4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c824bc8-9b78-5748-946c-f69ac75fe3b4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3216321a-8a51-5f67-ab28-6d2532cf5919',
                  type: 'epm-packages-assets',
                },
                {
                  id: '248923ac-b469-5f23-bba3-a34017eb0151',
                  type: 'epm-packages-assets',
                },
                {
                  id: '771648e7-6c3c-5401-bcbf-b94a68a1ab89',
                  type: 'epm-packages-assets',
                },
                {
                  id: '524d5bc7-228d-525b-aba6-b6a9b7a47e0d',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c46f811b-1272-5e60-b541-991d6488ed0b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e1152fc2-ff44-5aee-b50f-8f3392200ae6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cbfb9f7f-c2b0-5ad1-8142-186779d63d59',
                  type: 'epm-packages-assets',
                },
                {
                  id: '766355b9-e473-5b2e-b4c9-e6cfa6c606fb',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8ac54866-3726-5bb7-bad9-38dc33fabe82',
                  type: 'epm-packages-assets',
                },
                {
                  id: '16ce8168-57ca-5917-bd4c-d691a048ad16',
                  type: 'epm-packages-assets',
                },
                {
                  id: '20cdcaf5-b230-50bf-a158-acad9fc5ec3f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fa20298e-f329-56d8-a90d-0bc4458d4ed6',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b3c04a1f-21fc-5920-bb41-9b57f63ada84',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e3c01bc2-8b91-5237-8a11-a31c498cd83f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ab95d679-cc4c-5c98-9f31-43630048ca91',
                  type: 'epm-packages-assets',
                },
                {
                  id: '95912025-a6fd-50bc-89ab-214d13013a4d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9003167b-4635-5657-ad7d-1ad97a398dc9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3dd15282-74fd-5a9a-b885-aa0dba07cc66',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b7c2a529-1f58-5781-8560-74693ab845ab',
                  type: 'epm-packages-assets',
                },
                {
                  id: '19a34883-dcaf-59a6-ac26-3daec6076098',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ebcf8c0e-c666-568e-ab05-56a611c20875',
                  type: 'epm-packages-assets',
                },
                {
                  id: '33132e16-5251-5e5f-b3c7-bcf0e65d1cae',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0a26359a-55e4-5db4-abda-a5f3162ac7d2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9818891b-8944-5b04-849a-12c61ffbdfb5',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ee08d0de-f1c7-58bb-9609-3d91657a2778',
                  type: 'epm-packages-assets',
                },
                {
                  id: '51a6e576-0d80-57e4-a099-88bb372781a9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a3b7378e-d5c7-59a8-9a7e-cee7c0f8096c',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e87628f-7f7b-5cbd-9a1b-98ff349b66aa',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8a04ebe0-1cc0-5908-aee1-a8f35aff13f2',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a71bbec1-1bb1-5d85-aa16-5838c70f5d63',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'fd15a96f-74fd-547a-9622-76a14936340d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '930af1aa-48ea-5cc3-866a-c615fc76c48b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3faeefc7-d1c9-52be-9ba5-f75b37f3551b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ba4741d3-49e3-5e26-8176-33c0be6da6de',
                  type: 'epm-packages-assets',
                },
                {
                  id: '621af1a9-fa73-5d2f-831b-ed4ef32f338a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b875346a-0191-582c-855a-8b82c767640b',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'a12e0cb6-5d29-5932-9223-6d8b49b0e65d',
                  type: 'epm-packages-assets',
                },
                {
                  id: '58f95c77-ed95-5e5d-8412-e7ae37d82f80',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8d01fc4e-b10a-5802-814f-b80202548327',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e648e969-e0c7-50e1-a9c3-b8201d267d35',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8f9c18e3-52c7-5d8e-94c8-e87122ad30de',
                  type: 'epm-packages-assets',
                },
                {
                  id: '106e06e5-a6fa-5e10-9ba7-b1146181e001',
                  type: 'epm-packages-assets',
                },
                {
                  id: '73f0c353-edb5-530f-9c4b-3b3f2488c66b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '87453afc-27f2-58a2-a633-84cf698070f7',
                  type: 'epm-packages-assets',
                },
                {
                  id: '09a768d3-79c8-5d6d-b50b-7b8118585774',
                  type: 'epm-packages-assets',
                },
                {
                  id: '449ce74a-6d50-5742-9d99-6e16e0453b41',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'dddf7395-0979-54cd-b8cc-35d7d9091f95',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b6d765b9-18a5-5048-b801-fa9de6b7cfb2',
                  type: 'epm-packages-assets',
                },
                {
                  id: '587bb82b-755a-5b14-8f91-7eb11ba3b5a9',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9990dbfe-1c2e-5e4d-ad16-4ef360698b05',
                  type: 'epm-packages-assets',
                },
                {
                  id: '52f62db8-da37-56b1-b5a6-003992fb469a',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b5dfa663-116c-5219-a797-b0aae4ef608b',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9276f03e-434b-5deb-a3c9-5463bd846b77',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7c92ec36-e5a8-5d2a-9b77-e19847ca962f',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ead76df6-9380-55d8-ac8b-cbd3a74e9f23',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'faedf742-81cf-57e7-83ff-1e72df1da7f4',
                  type: 'epm-packages-assets',
                },
                {
                  id: '88a58712-7e6a-50d2-97f3-4de63e89fa79',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1f546815-bcb9-5770-952e-7ea9cb89f9bd',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bfc48dd6-2986-5398-8290-fc81842c52d9',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd5efde78-da8b-59e0-8e1d-445658659ed0',
                  type: 'epm-packages-assets',
                },
                {
                  id: '904899f7-c8d9-547c-afbc-e91f61338e26',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6d27d11c-e9fa-50fa-b26c-694f87e0b7b1',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c5ed7ee9-a54b-5f23-8696-d5b1c25b531f',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4b7e8e94-0843-518e-b159-002c540f8b43',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f770c593-5207-5d92-8ef6-3c790e7e9eb0',
                  type: 'epm-packages-assets',
                },
              ],
              es_index_patterns: {
                findings: 'logs-cloud_security_posture.findings-*',
                vulnerabilities: 'logs-cloud_security_posture.vulnerabilities-*',
              },
              name: 'cloud_security_posture',
              version: '1.9.0-preview04',
              install_version: '1.9.0-preview04',
              install_status: 'installed',
              install_started_at: '2024-04-29T21:55:09.509Z',
              install_source: 'registry',
              install_format_schema_version: '1.2.0',
              keep_policies_up_to_date: true,
              verification_status: 'unknown',
              latest_install_failed_attempts: [],
              verification_key_id: null,
              experimental_data_stream_features: [],
            },
            references: [],
            managed: false,
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: '10.2.0',
          },
          installationInfo: {
            created_at: '2024-04-04T14:57:54.879Z',
            updated_at: '2024-04-29T21:55:18.196Z',
            namespaces: [],
            type: 'epm-packages',
            installed_kibana: [
              {
                id: 'cloud_security_posture-07a5e6d6-982d-4c7c-a845-5f2be43279c9',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-9129a080-7f48-11ec-8249-431333f83c5f',
                type: 'index-pattern',
              },
              {
                id: 'cloud_security_posture-c406d945-a359-4c04-9a6a-65d66de8706b',
                type: 'index-pattern',
              },
              {
                id: '00bb0b02-fe51-5b6b-a2b5-d51608ec7d4c',
                type: 'csp-rule-template',
              },
              {
                id: '01629238-aea8-5737-a59b-45baf8dab404',
                type: 'csp-rule-template',
              },
              {
                id: '02ca1a3a-559e-53d7-afcd-8e3774c4efb9',
                type: 'csp-rule-template',
              },
              {
                id: '02da047f-bc78-5565-86a0-e121850f76c0',
                type: 'csp-rule-template',
              },
              {
                id: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae',
                type: 'csp-rule-template',
              },
              {
                id: '05480064-f899-53e8-b8ad-34172b09b400',
                type: 'csp-rule-template',
              },
              {
                id: '05676b4e-3274-5984-9981-6aa1623c24ec',
                type: 'csp-rule-template',
              },
              {
                id: '05c4bd94-162d-53e8-b112-e617ce74f8f6',
                type: 'csp-rule-template',
              },
              {
                id: '05f0c324-5c11-576f-b7a2-35ebf66f084b',
                type: 'csp-rule-template',
              },
              {
                id: '06161f41-c17a-586f-b08e-c45ea5157da0',
                type: 'csp-rule-template',
              },
              {
                id: '06635c87-1e11-59c3-9eba-b4d8a08ba899',
                type: 'csp-rule-template',
              },
              {
                id: '067385c5-d3a0-536a-bd4f-ed7c1f4033ce',
                type: 'csp-rule-template',
              },
              {
                id: '08d850ca-c1be-57e2-ac39-5e38f8750cf6',
                type: 'csp-rule-template',
              },
              {
                id: '090923c7-e599-572b-bad3-703f768c262a',
                type: 'csp-rule-template',
              },
              {
                id: '0bdfe13d-7bc8-5415-8517-65114d344798',
                type: 'csp-rule-template',
              },
              {
                id: '0d5ddd5f-749b-516b-89ca-b5bf18ba4861',
                type: 'csp-rule-template',
              },
              {
                id: '0e318770-7077-5996-afd8-27ca34fc5446',
                type: 'csp-rule-template',
              },
              {
                id: '1054ef6c-8f47-5d20-a922-8df0ac93acfa',
                type: 'csp-rule-template',
              },
              {
                id: '129b07b7-4470-5224-8246-6ae975d6304b',
                type: 'csp-rule-template',
              },
              {
                id: '1316108c-33a8-5198-9529-45716c5a87b1',
                type: 'csp-rule-template',
              },
              {
                id: '151312c8-7e97-5420-ac05-5a916b3c1feb',
                type: 'csp-rule-template',
              },
              {
                id: '15c6f217-2ae2-5bb4-8ebe-f40adf02910d',
                type: 'csp-rule-template',
              },
              {
                id: '1706a986-39d7-5900-93eb-f191f6a40892',
                type: 'csp-rule-template',
              },
              {
                id: '17282e92-075f-593d-99eb-99346e4288ed',
                type: 'csp-rule-template',
              },
              {
                id: '1915b785-942d-5613-9a24-b40394ef745f',
                type: 'csp-rule-template',
              },
              {
                id: '1a8ee966-458a-5ff9-a6e9-436aba157ebd',
                type: 'csp-rule-template',
              },
              {
                id: '1b112bf6-61ad-5b08-888b-7b6c86b3526c',
                type: 'csp-rule-template',
              },
              {
                id: '1b89acc6-978c-57c3-b319-680e5251d6f6',
                type: 'csp-rule-template',
              },
              {
                id: '1d0a20ee-ad20-5416-84c8-32c0f69b209b',
                type: 'csp-rule-template',
              },
              {
                id: '1d6ff20d-4803-574b-80d2-e47031d9baa2',
                type: 'csp-rule-template',
              },
              {
                id: '1e180f0d-3419-5681-838b-9247927eb0f6',
                type: 'csp-rule-template',
              },
              {
                id: '1e4f8b50-90e4-5e99-8a40-a21b142eb6b4',
                type: 'csp-rule-template',
              },
              {
                id: '1ea2df8f-a973-561b-a1f9-a0bea9cfba36',
                type: 'csp-rule-template',
              },
              {
                id: '1f9c62f6-5c4a-59e6-9a12-0260b7e04a37',
                type: 'csp-rule-template',
              },
              {
                id: '213e2b33-f2b1-575b-8753-f239b278c25a',
                type: 'csp-rule-template',
              },
              {
                id: '23941040-0aae-5afd-bc8d-793742133647',
                type: 'csp-rule-template',
              },
              {
                id: '23e5f81e-ca05-53bf-8109-7e676feecee3',
                type: 'csp-rule-template',
              },
              {
                id: '266ccbf1-813d-529b-b7a6-3d225d3dc1a9',
                type: 'csp-rule-template',
              },
              {
                id: '26ff6dff-042f-5901-8191-0e347d113e9e',
                type: 'csp-rule-template',
              },
              {
                id: '27896f4b-0405-5388-bacd-182e77556711',
                type: 'csp-rule-template',
              },
              {
                id: '27acd88e-c64f-5e9e-9cff-2de649f92ccf',
                type: 'csp-rule-template',
              },
              {
                id: '28f96eda-c94e-597c-aef0-0bceee085540',
                type: 'csp-rule-template',
              },
              {
                id: '29cefccd-77fe-5428-8bea-3fc1390d5d1e',
                type: 'csp-rule-template',
              },
              {
                id: '2b7b51e2-7e54-5b24-bc9c-6d09416fd5dc',
                type: 'csp-rule-template',
              },
              {
                id: '2d0044e3-d235-5703-9c16-729932a0131e',
                type: 'csp-rule-template',
              },
              {
                id: '2f7d9d2a-ec1f-545a-8258-ea62bbffad7f',
                type: 'csp-rule-template',
              },
              {
                id: '328a73c3-011d-5827-ae86-4e323739e4e1',
                type: 'csp-rule-template',
              },
              {
                id: '33299b3d-68da-5604-8c62-62690fd40c49',
                type: 'csp-rule-template',
              },
              {
                id: '33a612ed-8dee-554d-9dd7-857bfc31a33a',
                type: 'csp-rule-template',
              },
              {
                id: '34a4790c-0214-5eec-b97d-1c11ffa6861e',
                type: 'csp-rule-template',
              },
              {
                id: '34b16c08-cf25-5f0d-afed-98f75b5513de',
                type: 'csp-rule-template',
              },
              {
                id: '34c9c662-5072-5195-835e-48da9be5047f',
                type: 'csp-rule-template',
              },
              {
                id: '368b52f8-b468-5fc7-9e47-b1b5e040e051',
                type: 'csp-rule-template',
              },
              {
                id: '374309b1-b87a-58bd-b795-1067d2e8ee9f',
                type: 'csp-rule-template',
              },
              {
                id: '3760ac17-de0b-537d-8e74-455d132d19d2',
                type: 'csp-rule-template',
              },
              {
                id: '37fc1edc-a59d-5e63-a530-d3d088195865',
                type: 'csp-rule-template',
              },
              {
                id: '3851b212-b300-545d-8d6b-54ef71c86661',
                type: 'csp-rule-template',
              },
              {
                id: '38535c6f-a478-5cbb-82de-9417a3968bd6',
                type: 'csp-rule-template',
              },
              {
                id: '394963fa-63fd-5e81-82eb-ea1b8dfacd53',
                type: 'csp-rule-template',
              },
              {
                id: '3afddcd1-b745-5b3c-8623-ce4abe6878b5',
                type: 'csp-rule-template',
              },
              {
                id: '3bfcca47-de6a-57d4-961f-3c7f5b5f699c',
                type: 'csp-rule-template',
              },
              {
                id: '3cd971cb-cf64-51ef-875b-9a7787cd97cb',
                type: 'csp-rule-template',
              },
              {
                id: '3d701761-f9b6-5c2d-ab99-928161d2ebbd',
                type: 'csp-rule-template',
              },
              {
                id: '3ed0b9d8-c5f2-55e2-92a5-2531868e79ca',
                type: 'csp-rule-template',
              },
              {
                id: '3ef4430e-2829-576a-a813-edc766625ea9',
                type: 'csp-rule-template',
              },
              {
                id: '3fb6051e-31f8-5fb5-bd45-4f140fa4442e',
                type: 'csp-rule-template',
              },
              {
                id: '40ab36e3-7438-5c36-afcd-bf5f5401366e',
                type: 'csp-rule-template',
              },
              {
                id: '421191d6-a13c-5c78-8c5b-102e1229655f',
                type: 'csp-rule-template',
              },
              {
                id: '429ada1f-ad8f-5c2d-97fd-31485ace8a0c',
                type: 'csp-rule-template',
              },
              {
                id: '43d5538c-17a3-5e04-9c06-ad4323bfd188',
                type: 'csp-rule-template',
              },
              {
                id: '449bf7bf-8070-580f-a3aa-66bc7f94a721',
                type: 'csp-rule-template',
              },
              {
                id: '461c5ca2-0173-5b8c-ae36-b229cffefbb2',
                type: 'csp-rule-template',
              },
              {
                id: '47ee9344-791e-50e4-a266-ee2ebce093a7',
                type: 'csp-rule-template',
              },
              {
                id: '4931d684-a386-5545-b2c4-47b836e0149b',
                type: 'csp-rule-template',
              },
              {
                id: '49c71814-2dbe-5204-ad07-879a80503fbc',
                type: 'csp-rule-template',
              },
              {
                id: '49fe9df5-e86f-5981-ac24-dcaadadc2790',
                type: 'csp-rule-template',
              },
              {
                id: '4a130791-cdb3-5524-b45d-1f3df79e2452',
                type: 'csp-rule-template',
              },
              {
                id: '4a6a8b7a-d7a2-5a52-af5c-70009500bbc5',
                type: 'csp-rule-template',
              },
              {
                id: '4b11956d-7985-524e-900e-20405e2baaca',
                type: 'csp-rule-template',
              },
              {
                id: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45',
                type: 'csp-rule-template',
              },
              {
                id: '4cfe4df4-4157-53bb-820f-278fe02ec960',
                type: 'csp-rule-template',
              },
              {
                id: '4d0a1c5a-27b5-5429-895d-e90878fcce1d',
                type: 'csp-rule-template',
              },
              {
                id: '4da6e870-fed1-5822-bb2d-f6a1714bc4a8',
                type: 'csp-rule-template',
              },
              {
                id: '4eb0d962-c123-575e-8c0c-9d10a2fbe5d1',
                type: 'csp-rule-template',
              },
              {
                id: '4f7354df-2e3b-5acf-9ba7-d6b5cfd12e35',
                type: 'csp-rule-template',
              },
              {
                id: '506b205e-9b6a-5d6e-b136-3e5d7101b1bc',
                type: 'csp-rule-template',
              },
              {
                id: '50da62ee-4099-5950-ba1e-984794749f28',
                type: 'csp-rule-template',
              },
              {
                id: '5133d843-d913-5c1c-930f-89560b828704',
                type: 'csp-rule-template',
              },
              {
                id: '5382994d-59e0-54d9-a32b-dd860c467813',
                type: 'csp-rule-template',
              },
              {
                id: '5411a1e9-a529-5512-b556-93178e544c9e',
                type: 'csp-rule-template',
              },
              {
                id: '551d3a0b-36f6-51c6-ba8b-0a83926b1864',
                type: 'csp-rule-template',
              },
              {
                id: '551e7bcf-b231-500d-a193-d0a98163a680',
                type: 'csp-rule-template',
              },
              {
                id: '555cf8d5-f963-5574-a856-e06614cf9341',
                type: 'csp-rule-template',
              },
              {
                id: '5cdc703f-54ea-5de6-97c4-9fdb495725ef',
                type: 'csp-rule-template',
              },
              {
                id: '5d7e7fce-64fb-5b7b-beeb-920496c2e333',
                type: 'csp-rule-template',
              },
              {
                id: '5dd8b281-9a80-50a7-a03d-fe462a5a2ba0',
                type: 'csp-rule-template',
              },
              {
                id: '5de29f7b-ba03-5c77-81d9-7ea65ebd6a0f',
                type: 'csp-rule-template',
              },
              {
                id: '5ecb8a19-541a-5578-9b9d-b22c1bfbc5e9',
                type: 'csp-rule-template',
              },
              {
                id: '5ee4897d-808b-5ad6-877b-a276f8e65076',
                type: 'csp-rule-template',
              },
              {
                id: '5ee69b99-8f70-5daf-b784-866131aca3ba',
                type: 'csp-rule-template',
              },
              {
                id: '61ab077c-fc0f-5920-8bcf-ccc037a4139b',
                type: 'csp-rule-template',
              },
              {
                id: '62b717ac-bb8f-5274-a99f-5806dc4427a5',
                type: 'csp-rule-template',
              },
              {
                id: '64d37675-473f-5edc-882e-5b8b85b789c3',
                type: 'csp-rule-template',
              },
              {
                id: '64feecfc-7166-5d77-b830-bf4a8dd2e05d',
                type: 'csp-rule-template',
              },
              {
                id: '6588bb48-d02b-5169-a013-fe4dc115c709',
                type: 'csp-rule-template',
              },
              {
                id: '668cee84-c115-5166-a422-05c4d3e88c2c',
                type: 'csp-rule-template',
              },
              {
                id: '66cd0518-cfa3-5917-a399-a7dfde4e19db',
                type: 'csp-rule-template',
              },
              {
                id: '66cdd4cc-5870-50e1-959c-91443716b87a',
                type: 'csp-rule-template',
              },
              {
                id: '677bdabb-ee3f-58a6-82f6-d40ccc4efe13',
                type: 'csp-rule-template',
              },
              {
                id: '67909c46-649c-52c1-a464-b3e81615d938',
                type: 'csp-rule-template',
              },
              {
                id: '68cfd04b-fc79-5877-8638-af3aa82d92db',
                type: 'csp-rule-template',
              },
              {
                id: '68f9d23f-882f-55d1-86c6-711413c31129',
                type: 'csp-rule-template',
              },
              {
                id: '69ffe7f6-bc09-5019-ba77-a2f81169e9de',
                type: 'csp-rule-template',
              },
              {
                id: '6b3b122f-ac19-5a57-b6d0-131daf3fbf6d',
                type: 'csp-rule-template',
              },
              {
                id: '6d58f558-d07a-541c-b720-689459524679',
                type: 'csp-rule-template',
              },
              {
                id: '6de73498-23d7-537f-83f3-08c660217e7e',
                type: 'csp-rule-template',
              },
              {
                id: '6e339632-0d1c-5a7c-8ca3-fac5813932d9',
                type: 'csp-rule-template',
              },
              {
                id: '6e46620d-cf63-55f9-b025-01889df276fd',
                type: 'csp-rule-template',
              },
              {
                id: '6e6481f1-5ede-552b-84e5-cceed281052a',
                type: 'csp-rule-template',
              },
              {
                id: '70f92ed3-5659-5c95-a8f8-a63211c57635',
                type: 'csp-rule-template',
              },
              {
                id: '71cd1aed-48f7-5490-a63d-e22436549822',
                type: 'csp-rule-template',
              },
              {
                id: '72bb12e0-31c0-54f4-a409-4aace3b602be',
                type: 'csp-rule-template',
              },
              {
                id: '737dc646-1c66-5fb6-8fcd-1aac6402532d',
                type: 'csp-rule-template',
              },
              {
                id: '741aa940-22a7-5015-95d5-f94b331d774e',
                type: 'csp-rule-template',
              },
              {
                id: '756e1a54-b2ce-56b9-a13f-17f652d7767c',
                type: 'csp-rule-template',
              },
              {
                id: '76be4dd2-a77a-5981-a893-db6770b35911',
                type: 'csp-rule-template',
              },
              {
                id: '76fea8f6-7bf2-5dc4-85f0-1aec20fbf100',
                type: 'csp-rule-template',
              },
              {
                id: '77d274cb-69ae-5a85-b8f6-ba192aee8af4',
                type: 'csp-rule-template',
              },
              {
                id: '7a2ab526-3440-5a0f-804c-c5eea8158053',
                type: 'csp-rule-template',
              },
              {
                id: '7bb02abe-d669-5058-a2d6-6ce5ee2dc2be',
                type: 'csp-rule-template',
              },
              {
                id: '7c908585-ec93-52dc-81bb-ceb17cd4c313',
                type: 'csp-rule-template',
              },
              {
                id: '7d1de53a-a32e-55c0-b412-317ed91f65e0',
                type: 'csp-rule-template',
              },
              {
                id: '7e584486-4d0f-5edb-8a64-7ee0b59333b8',
                type: 'csp-rule-template',
              },
              {
                id: '7eebf1d9-7a68-54fd-89b7-0f8b1441a179',
                type: 'csp-rule-template',
              },
              {
                id: '80db9189-cd4d-572a-94dc-e635ee8af7fa',
                type: 'csp-rule-template',
              },
              {
                id: '81554879-3338-5208-9db3-efb2a549d38c',
                type: 'csp-rule-template',
              },
              {
                id: '8233dcc7-c6af-5110-b7d4-239a70d7bed5',
                type: 'csp-rule-template',
              },
              {
                id: '83fe7d80-9b1b-50a1-8aad-c68fd26dfdd4',
                type: 'csp-rule-template',
              },
              {
                id: '84862c2c-4aba-5458-9c5f-12855091617b',
                type: 'csp-rule-template',
              },
              {
                id: '84b8b7be-d917-50f3-beab-c076d0098d83',
                type: 'csp-rule-template',
              },
              {
                id: '84c7925a-42ff-5999-b784-ab037f6242c6',
                type: 'csp-rule-template',
              },
              {
                id: '873e6387-218d-587a-8fa1-3d65f4a77802',
                type: 'csp-rule-template',
              },
              {
                id: '875c1196-b6c7-5bc9-b255-e052853c3d08',
                type: 'csp-rule-template',
              },
              {
                id: '87952b8d-f537-5f8a-b57b-63a31b031170',
                type: 'csp-rule-template',
              },
              {
                id: '882ffc80-73e9-56aa-ae72-73b39af6702f',
                type: 'csp-rule-template',
              },
              {
                id: '88634421-e47c-59fb-9466-a86023f20dd5',
                type: 'csp-rule-template',
              },
              {
                id: '88734e31-d055-58ba-bf70-7d40d0b4e707',
                type: 'csp-rule-template',
              },
              {
                id: '89a294ae-d736-51ca-99d4-0ea4782caed0',
                type: 'csp-rule-template',
              },
              {
                id: '89b58088-54f6-55dc-96a3-f08ac4b27ea3',
                type: 'csp-rule-template',
              },
              {
                id: '89cc8ff0-be81-55f2-b1cf-d7db1e214741',
                type: 'csp-rule-template',
              },
              {
                id: '89ebec6b-3cc4-5898-a3b9-534174f93051',
                type: 'csp-rule-template',
              },
              {
                id: '8a985fda-fc4c-5435-b7f0-c4d40bb1307a',
                type: 'csp-rule-template',
              },
              {
                id: '8c36c21b-3c8f-5a92-bc7e-62871428f4d2',
                type: 'csp-rule-template',
              },
              {
                id: '8d3f2919-da46-5502-b48b-9ba41d03281b',
                type: 'csp-rule-template',
              },
              {
                id: '8daf3f8a-8cb0-58f4-955a-ce2dd2a11f75',
                type: 'csp-rule-template',
              },
              {
                id: '8f2644ed-70b5-576f-b9b9-aabea6821749',
                type: 'csp-rule-template',
              },
              {
                id: '8f88e7f7-6924-5913-bc18-95fcdc5ae744',
                type: 'csp-rule-template',
              },
              {
                id: '900567f0-4c2f-543a-b5cf-d11223a772a2',
                type: 'csp-rule-template',
              },
              {
                id: '90b8ae5e-df30-5ba6-9fe9-03aab2b7a1c3',
                type: 'csp-rule-template',
              },
              {
                id: '9126cd85-611c-5b06-b2f2-a18338e26ae1',
                type: 'csp-rule-template',
              },
              {
                id: '919ef7a7-126c-517e-aa35-fb251b1ad587',
                type: 'csp-rule-template',
              },
              {
                id: '91d52d43-da61-5ba2-a4d4-1018fee84559',
                type: 'csp-rule-template',
              },
              {
                id: '92077c86-0322-5497-b94e-38ef356eadd6',
                type: 'csp-rule-template',
              },
              {
                id: '9209df46-e7e2-5d4b-b1b6-b54a196e7e5d',
                type: 'csp-rule-template',
              },
              {
                id: '9259a915-0294-54d6-b379-162ceb36e875',
                type: 'csp-rule-template',
              },
              {
                id: '9272d2b5-4e25-5658-8a6c-d917f60134ec',
                type: 'csp-rule-template',
              },
              {
                id: '92ab0102-d825-52ce-87a8-1d0b4e06166c',
                type: 'csp-rule-template',
              },
              {
                id: '933268ec-44e8-5fba-9ed7-535804521cc7',
                type: 'csp-rule-template',
              },
              {
                id: '934583bd-306a-51d9-a730-020bd45f7f01',
                type: 'csp-rule-template',
              },
              {
                id: '936ea3f4-b4bc-5f3a-a7a0-dec9bda0a48c',
                type: 'csp-rule-template',
              },
              {
                id: '93808f1f-f05e-5e48-b130-5527795e6158',
                type: 'csp-rule-template',
              },
              {
                id: '9482a2bf-7e11-59eb-9d09-1e0c06cc1d8e',
                type: 'csp-rule-template',
              },
              {
                id: '94fb43f8-90da-5089-b503-66a04faa2630',
                type: 'csp-rule-template',
              },
              {
                id: '94fbdc26-aa6f-52e6-9277-094174c46e29',
                type: 'csp-rule-template',
              },
              {
                id: '95e17dc2-ef2f-50d0-b1a8-84d2ae523c4b',
                type: 'csp-rule-template',
              },
              {
                id: '95e368ec-eebe-5aa1-bc86-9fa532a82d3a',
                type: 'csp-rule-template',
              },
              {
                id: '9718b528-8327-5eef-ad21-c8bed5532429',
                type: 'csp-rule-template',
              },
              {
                id: '97504079-0d62-5d0a-9939-17b57b444547',
                type: 'csp-rule-template',
              },
              {
                id: '9a0d57ac-a54d-5652-bf07-982d542bf296',
                type: 'csp-rule-template',
              },
              {
                id: '9a9d808f-61a9-55b7-a487-9d50fd2983c5',
                type: 'csp-rule-template',
              },
              {
                id: '9b3242a1-51a5-5b5e-8d29-70b9dd7ae7eb',
                type: 'csp-rule-template',
              },
              {
                id: '9c02cf2c-a61d-5ac4-bf6f-78d4ddfc265f',
                type: 'csp-rule-template',
              },
              {
                id: '9c2d1c63-7bf3-584d-b87a-043853dad7a4',
                type: 'csp-rule-template',
              },
              {
                id: '9ce2276b-db96-5aad-9329-08ce874c5db6',
                type: 'csp-rule-template',
              },
              {
                id: '9e87e9e4-2701-5c8e-8dc3-4ccb712afa4b',
                type: 'csp-rule-template',
              },
              {
                id: '9ef34b4f-b9e1-566b-8a2b-69f8933fa852',
                type: 'csp-rule-template',
              },
              {
                id: '9fb9a46f-de59-580b-938e-829090bd3975',
                type: 'csp-rule-template',
              },
              {
                id: '9fc74adb-6ddd-5838-be72-cfd17fbfb74b',
                type: 'csp-rule-template',
              },
              {
                id: '9fcbc87c-0963-58ba-8e21-87e22b80fc27',
                type: 'csp-rule-template',
              },
              {
                id: 'a1f327c0-3e4b-5b55-891a-b91e720cd535',
                type: 'csp-rule-template',
              },
              {
                id: 'a22a5431-1471-534c-8e7c-1e16fe0a857c',
                type: 'csp-rule-template',
              },
              {
                id: 'a2447c19-a799-5270-9e03-ac322c2396d5',
                type: 'csp-rule-template',
              },
              {
                id: 'a3ffdc15-c93b-52a5-8e26-a27103b85bf3',
                type: 'csp-rule-template',
              },
              {
                id: 'a4b61e0e-b0ca-53c5-a744-4587c57e0f2d',
                type: 'csp-rule-template',
              },
              {
                id: 'a501efd2-73b9-5f92-a2c7-fa03ae753140',
                type: 'csp-rule-template',
              },
              {
                id: 'a52c1d16-d925-545d-bbd9-4257c2485eea',
                type: 'csp-rule-template',
              },
              {
                id: 'a6074b1d-e115-5416-bdc5-6e1940effd09',
                type: 'csp-rule-template',
              },
              {
                id: 'a6a43181-3a24-5ead-b845-1f1b56c95ad5',
                type: 'csp-rule-template',
              },
              {
                id: 'a72cb3ec-36ae-56b0-815f-9f986f0d499f',
                type: 'csp-rule-template',
              },
              {
                id: 'a7c6b368-29db-53e6-8b86-dfaddf719f59',
                type: 'csp-rule-template',
              },
              {
                id: 'a97eb244-d583-528c-a49a-17b0aa14decd',
                type: 'csp-rule-template',
              },
              {
                id: 'a9f473e3-a8b4-5076-b59a-f0d1c5a961ba',
                type: 'csp-rule-template',
              },
              {
                id: 'aa06a6a1-9cc3-5064-86bd-0f6dd7f80a11',
                type: 'csp-rule-template',
              },
              {
                id: 'aa4374f0-adab-580c-ac9d-907fd2783219',
                type: 'csp-rule-template',
              },
              {
                id: 'ab555e6d-b77e-5c85-b6a8-333f7e567b6b',
                type: 'csp-rule-template',
              },
              {
                id: 'abc6f4b4-3add-57c4-973d-c678df60804c',
                type: 'csp-rule-template',
              },
              {
                id: 'ad4de26d-02a8-5202-b718-48147bf0fd03',
                type: 'csp-rule-template',
              },
              {
                id: 'af0e7adc-2f70-5bf5-bce4-abf418bee40b',
                type: 'csp-rule-template',
              },
              {
                id: 'b0a70444-c719-5772-a8c1-2cd72578f8ee',
                type: 'csp-rule-template',
              },
              {
                id: 'b0ed2847-4db1-57c3-b2b6-49b0576a2506',
                type: 'csp-rule-template',
              },
              {
                id: 'b190337a-56a7-5906-8960-76fd05283599',
                type: 'csp-rule-template',
              },
              {
                id: 'b1b40df2-f562-564a-9d43-94774e1698d1',
                type: 'csp-rule-template',
              },
              {
                id: 'b287617d-7623-5d72-923d-e79b1301e06c',
                type: 'csp-rule-template',
              },
              {
                id: 'b2909440-5ad0-522e-8db0-9439d573b7d5',
                type: 'csp-rule-template',
              },
              {
                id: 'b3b3c352-fc81-5874-8bbc-31e2f58e884e',
                type: 'csp-rule-template',
              },
              {
                id: 'b4133ca4-32f1-501e-ad0a-a22700208a4f',
                type: 'csp-rule-template',
              },
              {
                id: 'b42eb917-8a4e-5cb7-93b1-886dbf2751bc',
                type: 'csp-rule-template',
              },
              {
                id: 'b449135c-8747-58fe-9d46-218728745520',
                type: 'csp-rule-template',
              },
              {
                id: 'b5493b70-e25f-54e6-9931-36138c33f775',
                type: 'csp-rule-template',
              },
              {
                id: 'b56e76ca-b976-5b96-ab3f-359e5b51ddf2',
                type: 'csp-rule-template',
              },
              {
                id: 'b6189255-e8a5-5a01-87a6-a1b408a0d92a',
                type: 'csp-rule-template',
              },
              {
                id: 'b64386ab-20fa-57d2-9b5b-631d64181531',
                type: 'csp-rule-template',
              },
              {
                id: 'b78aca72-f2c1-5cc2-b481-3f056f91bf4b',
                type: 'csp-rule-template',
              },
              {
                id: 'b794635d-a338-5b4e-bfa0-75257e854c6a',
                type: 'csp-rule-template',
              },
              {
                id: 'b8c40039-034b-5299-8660-a7c8d34efe36',
                type: 'csp-rule-template',
              },
              {
                id: 'b8f1182a-1b3e-5b08-8482-f74949163e97',
                type: 'csp-rule-template',
              },
              {
                id: 'b96194c6-8eb7-5835-852d-47b84db83697',
                type: 'csp-rule-template',
              },
              {
                id: 'ba545cc3-f447-5d14-8841-d3d3c05024e8',
                type: 'csp-rule-template',
              },
              {
                id: 'bac65dd0-771b-5bfb-8e5f-3b1dc8962684',
                type: 'csp-rule-template',
              },
              {
                id: 'bb264405-de3e-5b91-9654-2056f905fc67',
                type: 'csp-rule-template',
              },
              {
                id: 'bbc219e5-75d8-55d6-bccb-7d1acef796bf',
                type: 'csp-rule-template',
              },
              {
                id: 'bc5fb87e-7195-5318-9a2f-b8f6d487f961',
                type: 'csp-rule-template',
              },
              {
                id: 'bc6bb3c5-8c9b-5e76-9a58-8a55f42dce0e',
                type: 'csp-rule-template',
              },
              {
                id: 'be1197db-90d0-58db-b780-f0a939264bd0',
                type: 'csp-rule-template',
              },
              {
                id: 'c006dbcb-dbaf-5bf5-886a-e05d7e5e6e1b',
                type: 'csp-rule-template',
              },
              {
                id: 'c0ef1e12-b201-5736-8475-4b62978084e8',
                type: 'csp-rule-template',
              },
              {
                id: 'c13f49ab-845e-5a89-a05e-6a7c7b23f628',
                type: 'csp-rule-template',
              },
              {
                id: 'c1581c69-3e5c-5ab2-bdde-3619955a1dcf',
                type: 'csp-rule-template',
              },
              {
                id: 'c1e1ca12-c0e2-543e-819d-22249927d241',
                type: 'csp-rule-template',
              },
              {
                id: 'c28e606d-f6a7-58b2-820f-e2fb702bf956',
                type: 'csp-rule-template',
              },
              {
                id: 'c2b36f84-34b5-57fd-b9b0-f225be981497',
                type: 'csp-rule-template',
              },
              {
                id: 'c2d65e60-221b-5748-a545-579a69ad4a93',
                type: 'csp-rule-template',
              },
              {
                id: 'c40bebb5-5403-59d8-b960-00d6946931ce',
                type: 'csp-rule-template',
              },
              {
                id: 'c43a57db-5248-5855-a613-2a05d0a42768',
                type: 'csp-rule-template',
              },
              {
                id: 'c444d9e3-d3de-5598-90e7-95a922b51664',
                type: 'csp-rule-template',
              },
              {
                id: 'c455dba0-a768-5c76-8509-3484ec33102f',
                type: 'csp-rule-template',
              },
              {
                id: 'c52e86bd-55f1-5c6a-8349-918f97963346',
                type: 'csp-rule-template',
              },
              {
                id: 'c53dab24-a23f-53c6-8d36-f64cc03ab277',
                type: 'csp-rule-template',
              },
              {
                id: 'c67fb159-cec6-5114-bbfe-f9a1e57fdcd4',
                type: 'csp-rule-template',
              },
              {
                id: 'c8a8f827-fba6-58ee-80b8-e64a605a4902',
                type: 'csp-rule-template',
              },
              {
                id: 'c8f24be5-fd7d-510f-ab93-2440bb826750',
                type: 'csp-rule-template',
              },
              {
                id: 'c9e64bdb-9225-5f60-b31c-a2d62f5427f9',
                type: 'csp-rule-template',
              },
              {
                id: 'cb57543f-5435-55b5-97cf-bda29ec9094a',
                type: 'csp-rule-template',
              },
              {
                id: 'cd05adf8-d0fe-54b6-b1a0-93cf02bcec72',
                type: 'csp-rule-template',
              },
              {
                id: 'cda5f949-378c-5ef6-a65e-47187af983e4',
                type: 'csp-rule-template',
              },
              {
                id: 'd117cea4-376b-5cb7-ad81-58a2f4efb47e',
                type: 'csp-rule-template',
              },
              {
                id: 'd1d73385-2909-598a-acf7-bf1d8130f314',
                type: 'csp-rule-template',
              },
              {
                id: 'd1f8d730-5ee2-56bb-8065-78e8c8ae668c',
                type: 'csp-rule-template',
              },
              {
                id: 'd248e880-7d96-5559-a25c-0f56c289a2e7',
                type: 'csp-rule-template',
              },
              {
                id: 'd303c4f1-489c-56ca-add9-29820c2214af',
                type: 'csp-rule-template',
              },
              {
                id: 'd3d725bd-652f-573e-97f5-adfd002fab8e',
                type: 'csp-rule-template',
              },
              {
                id: 'd416ff74-0e84-56cc-a577-0cdeb6a220f6',
                type: 'csp-rule-template',
              },
              {
                id: 'd498d11f-6c2a-5593-b6c6-6960b28da84e',
                type: 'csp-rule-template',
              },
              {
                id: 'd57d6506-a519-5a29-a816-b1204ebfef21',
                type: 'csp-rule-template',
              },
              {
                id: 'd63a2fd8-7ba2-5589-9899-23f99fd8c846',
                type: 'csp-rule-template',
              },
              {
                id: 'd7011f2f-cd60-58cf-a184-eb2d5fb7339a',
                type: 'csp-rule-template',
              },
              {
                id: 'd98f24a9-e788-55d2-8b70-e9fe88311f9c',
                type: 'csp-rule-template',
              },
              {
                id: 'dafb527b-9869-5062-8d38-c9dced4a27c2',
                type: 'csp-rule-template',
              },
              {
                id: 'db28165f-6f7c-5450-b9f3-61c7b897d833',
                type: 'csp-rule-template',
              },
              {
                id: 'db58a1e4-de58-5899-bee8-f6ced89d6f80',
                type: 'csp-rule-template',
              },
              {
                id: 'dbd6a799-b6c3-5768-ab68-9bd6f63bbd48',
                type: 'csp-rule-template',
              },
              {
                id: 'dfc17731-aa8f-5ecc-878b-113d1db009ca',
                type: 'csp-rule-template',
              },
              {
                id: 'dfc4b9b5-43dc-5ec2-97b4-76a71621fa40',
                type: 'csp-rule-template',
              },
              {
                id: 'e06f9ef1-eedb-5f95-b8d4-36d27d602afd',
                type: 'csp-rule-template',
              },
              {
                id: 'e073f962-74d9-585b-ae5a-e37c461e9b7c',
                type: 'csp-rule-template',
              },
              {
                id: 'e1b73c05-5137-5b65-9513-6f8018b6deff',
                type: 'csp-rule-template',
              },
              {
                id: 'e1c469c1-89d2-5cbd-a1f1-fe8f636b151f',
                type: 'csp-rule-template',
              },
              {
                id: 'e2306922-4f95-5660-bf2e-9610f556de69',
                type: 'csp-rule-template',
              },
              {
                id: 'e24bf247-bfdc-5bbf-9813-165b905b52e6',
                type: 'csp-rule-template',
              },
              {
                id: 'e3c6b85b-703e-5891-a01f-640d59ec449e',
                type: 'csp-rule-template',
              },
              {
                id: 'e570dc22-4f5d-51db-a193-983cb7d20afe',
                type: 'csp-rule-template',
              },
              {
                id: 'e833e6a8-673d-56b2-a979-f9aa4e52cb71',
                type: 'csp-rule-template',
              },
              {
                id: 'e83a8e8a-e34b-5a01-8142-82d5aef60cab',
                type: 'csp-rule-template',
              },
              {
                id: 'e92ddce9-3cba-5e3d-adac-53df0350eca0',
                type: 'csp-rule-template',
              },
              {
                id: 'ea3378aa-250e-50d8-9260-ff8237cf09a2',
                type: 'csp-rule-template',
              },
              {
                id: 'eb9e71ae-113b-5631-9e5c-b7fdc0b0666e',
                type: 'csp-rule-template',
              },
              {
                id: 'ec7949d4-9e55-5f44-8c4a-a0e674a2a46f',
                type: 'csp-rule-template',
              },
              {
                id: 'ed797ade-c473-5b6a-b1e2-1fd4410f7156',
                type: 'csp-rule-template',
              },
              {
                id: 'eda32e5d-3684-5205-b3a4-bbddacddc60f',
                type: 'csp-rule-template',
              },
              {
                id: 'edccbc31-3c4d-5d38-af6a-7fd1d9860bff',
                type: 'csp-rule-template',
              },
              {
                id: 'ede1488a-e8cd-5d5f-a25d-96c136695594',
                type: 'csp-rule-template',
              },
              {
                id: 'ee5ea7e5-dcb4-5abc-ab8c-58b3223669ce',
                type: 'csp-rule-template',
              },
              {
                id: 'eeb00e89-7125-58e8-9248-b9f429583277',
                type: 'csp-rule-template',
              },
              {
                id: 'eed3e284-5030-56db-b749-01d7120dc577',
                type: 'csp-rule-template',
              },
              {
                id: 'ef3852ff-b0f9-51d5-af6d-b1b1fed72005',
                type: 'csp-rule-template',
              },
              {
                id: 'efec59bf-4563-5da7-a1db-f5c28e93b21f',
                type: 'csp-rule-template',
              },
              {
                id: 'f00c266c-0e28-5c49-b2b0-cd97603341ec',
                type: 'csp-rule-template',
              },
              {
                id: 'f1322e13-3fb3-5c9c-be8e-29d4ae293d22',
                type: 'csp-rule-template',
              },
              {
                id: 'f44d0940-2e62-5993-9028-d3e63ae23960',
                type: 'csp-rule-template',
              },
              {
                id: 'f507bb23-1a9d-55dd-8edc-19a33e64d646',
                type: 'csp-rule-template',
              },
              {
                id: 'f512a987-4f86-5fb3-b202-6b5de22a739f',
                type: 'csp-rule-template',
              },
              {
                id: 'f55af438-f955-51d3-b42f-60b0d48d86e4',
                type: 'csp-rule-template',
              },
              {
                id: 'f5f029ea-d16e-5661-bc66-3096aaeda2f3',
                type: 'csp-rule-template',
              },
              {
                id: 'f62488d2-4b52-57d4-8ecd-d8f47dcb3dda',
                type: 'csp-rule-template',
              },
              {
                id: 'f6cfd4ce-1b96-5871-aa9d-8dba2d701579',
                type: 'csp-rule-template',
              },
              {
                id: 'f6d0110b-51c5-54db-a531-29b0cb58d0f2',
                type: 'csp-rule-template',
              },
              {
                id: 'f78dad83-1fe2-5aba-8507-64ea9efb53d6',
                type: 'csp-rule-template',
              },
              {
                id: 'f8c6e5cf-cfce-5c11-b303-a20c7c1cd694',
                type: 'csp-rule-template',
              },
              {
                id: 'f9344da7-b640-5587-98b8-9d9066000883',
                type: 'csp-rule-template',
              },
              {
                id: 'f9dfc7e7-d067-5be5-8fc1-5d9043a4cd06',
                type: 'csp-rule-template',
              },
              {
                id: 'fa9bbc09-3b1f-5344-a4a4-523a899a35b7',
                type: 'csp-rule-template',
              },
              {
                id: 'fb4368ab-cdee-5188-814c-a8197411ba22',
                type: 'csp-rule-template',
              },
              {
                id: 'fb8759d0-8564-572c-9042-d395b7e0b74d',
                type: 'csp-rule-template',
              },
              {
                id: 'fcc4b1b4-13e6-5908-be80-7ed36211de90',
                type: 'csp-rule-template',
              },
              {
                id: 'fd42f0d0-6e1d-53e5-b322-9a0eaa56948b',
                type: 'csp-rule-template',
              },
              {
                id: 'fdd3f5ce-cbfb-5abf-8b4e-988168d5e5a4',
                type: 'csp-rule-template',
              },
              {
                id: 'fdff0b83-dc73-5d60-9ad3-b98ed139a1b4',
                type: 'csp-rule-template',
              },
              {
                id: 'fe083488-fa0f-5408-9624-ac27607ac2ff',
                type: 'csp-rule-template',
              },
              {
                id: 'fe219241-4b9c-585f-b982-bb248852baa1',
                type: 'csp-rule-template',
              },
              {
                id: 'ff3a8287-e4ac-5a3c-b0d7-4f349e0ab077',
                type: 'csp-rule-template',
              },
              {
                id: 'ffc9fb91-dc44-512b-a558-036e8ce11282',
                type: 'csp-rule-template',
              },
            ],
            installed_kibana_space_id: 'default',
            installed_es: [
              {
                id: 'logs-cloud_security_posture.findings-default_policy',
                type: 'data_stream_ilm_policy',
              },
              {
                id: 'logs-cloud_security_posture.findings-1.9.0-preview04',
                type: 'ingest_pipeline',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities-1.9.0-preview04',
                type: 'ingest_pipeline',
              },
              {
                id: 'logs-cloud_security_posture.findings',
                type: 'index_template',
              },
              {
                id: 'logs-cloud_security_posture.findings@package',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.findings@custom',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities',
                type: 'index_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities@package',
                type: 'component_template',
              },
              {
                id: 'logs-cloud_security_posture.vulnerabilities@custom',
                type: 'component_template',
              },
            ],
            install_status: 'installed',
            install_source: 'registry',
            name: 'cloud_security_posture',
            version: '1.9.0-preview04',
            verification_status: 'unknown',
            verification_key_id: null,
            experimental_data_stream_features: [],
            latest_install_failed_attempts: [],
          },
        },
      },
      { status: 200 }
    );
  }),
];
