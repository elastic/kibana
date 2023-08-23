/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getResourceVulnerabilitiesMockData = () => ({
  page: [
    {
      agent: {
        name: 'ip-172-31-15-210',
        id: '2d262db5-b637-4e46-a2a0-db409825ff46',
        ephemeral_id: '2af1be77-0bdf-4313-b375-592848fe60d7',
        type: 'cloudbeat',
        version: '8.8.0',
      },
      package: {
        path: 'usr/lib/snapd/snapd',
        fixed_version: '3.0.0-20220521103104-8f96da9f5d5e',
        name: 'gopkg.in/yaml.v3',
        type: 'gobinary',
        version: 'v3.0.0-20210107192922-496545a6307b',
      },
      resource: {
        name: 'elastic-agent-instance-a6c683d0-0977-11ee-bb0b-0af2059ffbbf',
        id: '0d103e99f17f355ba',
      },
      elastic_agent: {
        id: '2d262db5-b637-4e46-a2a0-db409825ff46',
        version: '8.8.0',
        snapshot: false,
      },
      vulnerability: {
        severity: 'HIGH',
        package: {
          fixed_version: '3.0.0-20220521103104-8f96da9f5d5e',
          name: 'gopkg.in/yaml.v3',
          version: 'v3.0.0-20210107192922-496545a6307b',
        },
        description:
          'An issue in the Unmarshal function in Go-Yaml v3 causes the program to crash when attempting to deserialize invalid input.',
        title: 'crash when attempting to deserialize invalid input',
        classification: 'CVSS',
        data_source: {
          ID: 'go-vulndb',
          URL: 'https://github.com/golang/vulndb',
          Name: 'The Go Vulnerability Database',
        },
        cwe: ['CWE-502'],
        reference: 'https://avd.aquasec.com/nvd/cve-2022-28948',
        score: {
          version: '3.1',
          base: 7.5,
        },
        report_id: 1686633719,
        scanner: {
          vendor: 'Trivy',
          version: 'v0.35.0',
        },
        id: 'CVE-2022-28948',
        enumeration: 'CVE',
        published_date: '2022-05-19T20:15:00Z',
        class: 'lang-pkgs',
        cvss: {
          redhat: {
            V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
            V3Score: 7.5,
          },
          nvd: {
            V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
            V2Vector: 'AV:N/AC:L/Au:N/C:N/I:N/A:P',
            V3Score: 7.5,
            V2Score: 5,
          },
          ghsa: {
            V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
            V3Score: 7.5,
          },
        },
      },
      cloud: {
        provider: 'aws',
        region: 'us-east-1',
        account: {
          name: 'elastic-security-cloud-security-dev',
          id: '704479110758',
        },
      },
      '@timestamp': '2023-06-13T06:15:16.182Z',
      cloudbeat: {
        commit_sha: '8497f3a4b4744c645233c5a13b45400367411c2f',
        commit_time: '2023-05-09T16:07:58Z',
        version: '8.8.0',
      },
      ecs: {
        version: '8.6.0',
      },
      data_stream: {
        namespace: 'default',
        type: 'logs',
        dataset: 'cloud_security_posture.vulnerabilities',
      },
      host: {
        name: 'ip-172-31-15-210',
      },
      event: {
        agent_id_status: 'auth_metadata_missing',
        sequence: 1686633719,
        ingested: '2023-06-15T18:37:56Z',
        created: '2023-06-13T06:15:16.18250081Z',
        kind: 'state',
        id: '5cad2983-4a74-455d-ab39-6c584acd3994',
        type: ['info'],
        category: ['vulnerability'],
        dataset: 'cloud_security_posture.vulnerabilities',
        outcome: 'success',
      },
    },
  ],
  total: 1,
});
