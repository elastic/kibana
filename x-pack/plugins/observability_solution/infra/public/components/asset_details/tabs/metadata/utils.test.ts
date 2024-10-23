/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraMetadata } from '../../../../../common/http_api';
import { getAllFields } from './utils';

describe('#getAllFields', () => {
  const host = {
    architecture: 'x86_64',
    containerized: false,
    hostname: 'host1',
    hasSystemIntegration: true,
    ip: [
      '10.10.10.10',
      '10.10.10.10',
      '100.100.100.1',
      'fe10::1c10:10ff:fe10:f10b',
      'fe10::1c8b:10ff:fe5b:7faa',
      'fe10::20c2:36ff:feed:f47f',
    ],
    mac: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
    name: 'host1',
    os: {
      codename: 'focal',
      family: 'debian',
      kernel: '5.15.109+',
      name: 'Ubuntu',
      platform: 'ubuntu',
      version: '20.04.6 LTS (Focal Fossa)',
    },
  };
  const agent = {
    ephemeral_id: '2a1f1122-09f8-8d3b-b000-e5dcea22a1b2',
    id: 'agent1',
    name: 'host1',
    type: 'metricbeat',
    version: '8.11.0',
  };

  const cloud = {
    account: {
      id: 'elastic-observability',
    },
    availability_zone: 'us-central1-c',
    instance: {
      id: '1111111111111111111',
      name: 'host1',
    },
    machine: {
      type: 'e2-standard-4',
    },
    project: {
      id: 'elastic-observability',
    },
    provider: 'gcp',
    region: 'us-central1',
  };

  it('should return empty array if no metadata info', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
    };
    expect(getAllFields(result)).toHaveLength(0);
  });

  it('should return empty array if no field value is provided', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host: {
          name: undefined,
        },
      },
    };
    expect(getAllFields(result)).toHaveLength(0);
  });

  it('should map metadata with nested properties', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host: {
          os: {
            name: 'Ubuntu',
          },
        },
      },
    };
    expect(getAllFields(result)).toStrictEqual([{ name: 'host.os.name', value: 'Ubuntu' }]);
  });

  it('should map metadata with nested properties with container data removing >3th level nesting', async () => {
    const result = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        container: {
          id: '33d16f043d5f8a7dcc2f9a2164920d0d7ca4c13a9f737bff3dbedb507d954b8e',
          name: 'load-generator',
          image: {
            name: 'ghcr.io/open-telemetry/demo:latest-loadgenerator', // accept
          },
          runtime: 'docker',
          network: {
            ingress: {
              bytes: 1410228770498, // ignore
            },
            egress: {
              bytes: 23527514469, // ignore
            },
          },
        },
      },
    } as InfraMetadata;
    expect(getAllFields(result)).toStrictEqual([
      {
        name: 'container.id',
        value: '33d16f043d5f8a7dcc2f9a2164920d0d7ca4c13a9f737bff3dbedb507d954b8e',
      },
      { name: 'container.name', value: 'load-generator' },
      {
        name: 'container.image.name',
        value: 'ghcr.io/open-telemetry/demo:latest-loadgenerator',
      },
      {
        name: 'container.runtime',
        value: 'docker',
      },
    ]);
  });

  it('should map metadata with partial host, agent, could data', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host: {
          name: 'host2',
          os: {
            name: 'Ubuntu',
          },
          mac: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
        },
        cloud: {
          instance: {
            id: '1111111111111111111',
            name: 'host1',
          },
        },
        agent: {
          id: 'agent2',
        },
      },
    };
    expect(getAllFields(result)).toStrictEqual([
      {
        name: 'host.name',
        value: 'host2',
      },
      { name: 'host.os.name', value: 'Ubuntu' },
      {
        name: 'host.mac',
        value: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
      },
      {
        name: 'agent.id',
        value: 'agent2',
      },
      {
        name: 'cloud.instance.id',
        value: '1111111111111111111',
      },
      {
        name: 'cloud.instance.name',
        value: 'host1',
      },
    ]);
  });

  it('should map metadata with only host data', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host,
      },
    };
    expect(getAllFields(result)).toStrictEqual([
      { name: 'host.architecture', value: 'x86_64' },
      { name: 'host.containerized', value: 'false' },
      { name: 'host.hostname', value: 'host1' },
      { name: 'host.hasSystemIntegration', value: 'true' },
      {
        name: 'host.ip',
        value: [
          '10.10.10.10',
          '10.10.10.10',
          '100.100.100.1',
          'fe10::1c10:10ff:fe10:f10b',
          'fe10::1c8b:10ff:fe5b:7faa',
          'fe10::20c2:36ff:feed:f47f',
        ],
      },
      {
        name: 'host.mac',
        value: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
      },
      { name: 'host.name', value: 'host1' },
      { name: 'host.os.codename', value: 'focal' },
      { name: 'host.os.family', value: 'debian' },
      { name: 'host.os.kernel', value: '5.15.109+' },
      { name: 'host.os.name', value: 'Ubuntu' },
      {
        name: 'host.os.platform',
        value: 'ubuntu',
      },
      {
        name: 'host.os.version',
        value: '20.04.6 LTS (Focal Fossa)',
      },
    ]);
  });

  it('should map metadata with host and cloud data', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host,
        cloud,
      },
    };

    expect(getAllFields(result)).toStrictEqual([
      { name: 'host.architecture', value: 'x86_64' },
      { name: 'host.containerized', value: 'false' },
      { name: 'host.hostname', value: 'host1' },
      { name: 'host.hasSystemIntegration', value: 'true' },
      {
        name: 'host.ip',
        value: [
          '10.10.10.10',
          '10.10.10.10',
          '100.100.100.1',
          'fe10::1c10:10ff:fe10:f10b',
          'fe10::1c8b:10ff:fe5b:7faa',
          'fe10::20c2:36ff:feed:f47f',
        ],
      },
      {
        name: 'host.mac',
        value: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
      },
      { name: 'host.name', value: 'host1' },
      { name: 'host.os.codename', value: 'focal' },
      { name: 'host.os.family', value: 'debian' },
      { name: 'host.os.kernel', value: '5.15.109+' },
      { name: 'host.os.name', value: 'Ubuntu' },
      {
        name: 'host.os.platform',
        value: 'ubuntu',
      },
      {
        name: 'host.os.version',
        value: '20.04.6 LTS (Focal Fossa)',
      },
      {
        name: 'cloud.account.id',
        value: 'elastic-observability',
      },
      {
        name: 'cloud.availability_zone',
        value: 'us-central1-c',
      },
      {
        name: 'cloud.instance.id',
        value: '1111111111111111111',
      },
      {
        name: 'cloud.instance.name',
        value: 'host1',
      },
      {
        name: 'cloud.machine.type',
        value: 'e2-standard-4',
      },
      {
        name: 'cloud.project.id',
        value: 'elastic-observability',
      },
      {
        name: 'cloud.provider',
        value: 'gcp',
      },
      {
        name: 'cloud.region',
        value: 'us-central1',
      },
    ]);
  });

  it('should map metadata with host and agent data', async () => {
    const result: InfraMetadata = {
      id: 'host1',
      name: 'host1',
      hasSystemIntegration: true,
      features: [
        {
          name: 'system.core',
          source: 'metrics',
        },
      ],
      info: {
        host,
        agent,
      },
    };

    expect(getAllFields(result)).toStrictEqual([
      { name: 'host.architecture', value: 'x86_64' },
      { name: 'host.containerized', value: 'false' },
      { name: 'host.hostname', value: 'host1' },
      { name: 'host.hasSystemIntegration', value: 'true' },
      {
        name: 'host.ip',
        value: [
          '10.10.10.10',
          '10.10.10.10',
          '100.100.100.1',
          'fe10::1c10:10ff:fe10:f10b',
          'fe10::1c8b:10ff:fe5b:7faa',
          'fe10::20c2:36ff:feed:f47f',
        ],
      },
      {
        name: 'host.mac',
        value: ['01-33-22-33-71-83', '1E-15-33-68-F8-5B', '1E-8B-55-5B-7F-AA'],
      },
      { name: 'host.name', value: 'host1' },
      { name: 'host.os.codename', value: 'focal' },
      { name: 'host.os.family', value: 'debian' },
      { name: 'host.os.kernel', value: '5.15.109+' },
      { name: 'host.os.name', value: 'Ubuntu' },
      {
        name: 'host.os.platform',
        value: 'ubuntu',
      },
      {
        name: 'host.os.version',
        value: '20.04.6 LTS (Focal Fossa)',
      },
      {
        name: 'agent.ephemeral_id',
        value: '2a1f1122-09f8-8d3b-b000-e5dcea22a1b2',
      },
      {
        name: 'agent.id',
        value: 'agent1',
      },
      {
        name: 'agent.name',
        value: 'host1',
      },
      {
        name: 'agent.type',
        value: 'metricbeat',
      },
      {
        name: 'agent.version',
        value: '8.11.0',
      },
    ]);
  });
});
