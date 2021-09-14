/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraMetadata } from '../../../../../../../../common/http_api';

export const getFields = (metadata: InfraMetadata, group: 'cloud' | 'host' | 'agent') => {
  switch (group) {
    case 'host':
      return prune([
        {
          name: 'host.architecture',
          value: metadata.info?.host?.architecture,
        },
        {
          name: 'host.hostname',
          value: metadata.info?.host?.name,
        },
        {
          name: 'host.id',
          value: metadata.info?.host?.id,
        },
        {
          name: 'host.ip',
          value: metadata.info?.host?.ip,
        },
        {
          name: 'host.mac',
          value: metadata.info?.host?.mac,
        },
        {
          name: 'host.name',
          value: metadata.info?.host?.name,
        },
        {
          name: 'host.os.build',
          value: metadata.info?.host?.os?.build,
        },
        {
          name: 'host.os.family',
          value: metadata.info?.host?.os?.family,
        },
        {
          name: 'host.os.name',
          value: metadata.info?.host?.os?.name,
        },
        {
          name: 'host.os.kernel',
          value: metadata.info?.host?.os?.kernel,
        },
        {
          name: 'host.os.platform',
          value: metadata.info?.host?.os?.platform,
        },
        {
          name: 'host.os.version',
          value: metadata.info?.host?.os?.version,
        },
      ]);
    case 'cloud':
      return prune([
        {
          name: 'cloud.account.id',
          value: metadata.info?.cloud?.account?.id,
        },
        {
          name: 'cloud.account.name',
          value: metadata.info?.cloud?.account?.name,
        },
        {
          name: 'cloud.availability_zone',
          value: metadata.info?.cloud?.availability_zone,
        },
        {
          name: 'cloud.instance.id',
          value: metadata.info?.cloud?.instance?.id,
        },
        {
          name: 'cloud.instance.name',
          value: metadata.info?.cloud?.instance?.name,
        },
        {
          name: 'cloud.machine.type',
          value: metadata.info?.cloud?.machine?.type,
        },
        {
          name: 'cloud.provider',
          value: metadata.info?.cloud?.provider,
        },
        {
          name: 'cloud.region',
          value: metadata.info?.cloud?.region,
        },
      ]);
    case 'agent':
      return prune([
        {
          name: 'agent.id',
          value: metadata.info?.agent?.id,
        },
        {
          name: 'agent.version',
          value: metadata.info?.agent?.version,
        },
        {
          name: 'agent.policy',
          value: metadata.info?.agent?.policy,
        },
      ]);
  }
};

const prune = (fields: Array<{ name: string; value: string | string[] | undefined }>) =>
  fields.filter((f) => !!f.value);
