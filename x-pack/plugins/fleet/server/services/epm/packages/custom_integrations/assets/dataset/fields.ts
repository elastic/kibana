/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'js-yaml';

export const createBaseFields = () => {
  const fields = [
    { name: 'data_stream.type', type: 'constant_keyword', description: 'Data stream type.' },
    { name: 'data_stream.dataset', type: 'constant_keyword', description: 'Data stream dataset.' },
    {
      name: 'data_stream.namespace',
      type: 'constant_keyword',
      description: 'Data stream namespace.',
    },
    { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
  ];
  return yaml.dump(fields);
};

export const createAgentFields = () => {
  const fields = [
    {
      name: 'cloud',
      title: 'Cloud',
      group: 2,
      description: 'Fields related to the cloud or infrastructure the events are coming from.',
      footnote:
        'Examples: If Metricbeat is running on an EC2 host and fetches data from its host, the cloud info contains the data about this machine. If Metricbeat runs on a remote machine outside the cloud and fetches data from a service running in the cloud, the field contains cloud data from the machine the service is running on.',
      type: 'group',
      fields: [
        {
          name: 'account.id',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'The cloud account or organization id used to identify different entities in a multi-tenant environment.\nExamples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
          example: 666777888999,
        },
        {
          name: 'availability_zone',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Availability zone in which this host is running.',
          example: 'us-east-1c',
        },
        {
          name: 'instance.id',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Instance ID of the host machine.',
          example: 'i-1234567890abcdef0',
        },
        {
          name: 'instance.name',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Instance name of the host machine.',
        },
        {
          name: 'machine.type',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Machine type of the host machine.',
          example: 't2.medium',
        },
        {
          name: 'provider',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean.',
          example: 'aws',
        },
        {
          name: 'region',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Region in which this host is running.',
          example: 'us-east-1',
        },
        {
          name: 'project.id',
          type: 'keyword',
          description: 'Name of the project in Google Cloud.',
        },
        {
          name: 'image.id',
          type: 'keyword',
          description: 'Image ID for the cloud instance.',
        },
      ],
    },
    {
      name: 'container',
      title: 'Container',
      group: 2,
      description:
        'Container fields are used for meta information about the specific container that is the source of information.\nThese fields help correlate data based containers from any runtime.',
      type: 'group',
      fields: [
        {
          name: 'id',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Unique container id.',
        },
        {
          name: 'image.name',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Name of the image the container was built on.',
        },
        {
          name: 'labels',
          level: 'extended',
          type: 'object',
          object_type: 'keyword',
          description: 'Image labels.',
        },
        {
          name: 'name',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Container name.',
        },
      ],
    },
    {
      name: 'host',
      title: 'Host',
      group: 2,
      description:
        'A host is defined as a general computing instance.\nECS host.* fields should be populated with details about the host on which the event happened, or from which the measurement was taken. Host types include hardware, virtual machines, Docker containers, and Kubernetes nodes.',
      type: 'group',
      fields: [
        {
          name: 'architecture',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Operating system architecture.',
          example: 'x86_64',
        },
        {
          name: 'domain',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description:
            "Name of the domain of which the host is a member.\nFor example, on Windows this could be the host's Active Directory domain or NetBIOS domain name. For Linux this could be the domain of the host's LDAP provider.",
          example: 'CONTOSO',
          default_field: false,
        },
        {
          name: 'hostname',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'Hostname of the host.\nIt normally contains what the `hostname` command returns on the host machine',
        },
        {
          name: 'id',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'Unique host id.\nAs hostname is not always unique, use values that are meaningful in your environment.\nExample: The current usage of `beat.name`',
        },
        {
          name: 'ip',
          level: 'core',
          type: 'ip',
          description: 'Host ip addresses.',
        },
        {
          name: 'mac',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Host mac addresses.',
        },
        {
          name: 'name',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use',
        },
        {
          name: 'os.family',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'OS family (such as redhat, debian, freebsd, windows).',
          example: 'debian',
        },
        {
          name: 'os.kernel',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Operating system kernel version as a raw string.',
          example: '4.4.0-112-generic',
        },
        {
          name: 'os.name',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          multi_fields: [
            {
              name: 'text',
              type: 'text',
              norms: false,
              default_field: false,
            },
          ],
          description: 'Operating system name, without the version.',
          example: 'Mac OS X',
        },
        {
          name: 'os.platform',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Operating system platform (such centos, ubuntu, windows).',
          example: 'darwin',
        },
        {
          name: 'os.version',
          level: 'extended',
          type: 'keyword',
          ignore_above: 1024,
          description: 'Operating system version as a raw string.',
          example: '10.14.1',
        },
        {
          name: 'type',
          level: 'core',
          type: 'keyword',
          ignore_above: 1024,
          description:
            'Type of host.\nFor Cloud providers this can be the machine type like `t2.medium`. If vm, this could be the container, for example, or other information meaningful in your environment',
        },
        {
          name: 'containerized',
          type: 'boolean',
          description: 'If the host is a container.\n',
        },
        {
          name: 'os.build',
          type: 'keyword',
          example: '18D109',
          description: 'OS build information.\n',
        },
        {
          name: 'os.codename',
          type: 'keyword',
          example: 'stretch',
          description: 'OS codename, if any.\n',
        },
      ],
    },
    {
      name: 'input.type',
      type: 'keyword',
      description: 'Input type',
    },
    {
      name: 'log.offset',
      type: 'long',
      description: 'Log offset',
    },
  ];
  return yaml.dump(fields);
};
