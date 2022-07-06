/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import { ObservabilityPublicPluginsStart } from '../plugin';
import { RouteParams } from '../routes';
import { EntityService, getService } from './get_service';

interface Props {
  routeParams: RouteParams<'/sandbox/entities'>;
}

// 1655398995746
// 1234567890123 13 places

function minutesToMs(min: number) {
  return 1000 * 60 * min;
}

export function EntitiesSandbox({ routeParams }: Props) {
  const [service, updateService] = useState<EntityService | null>(null);
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const { data } = services;
  useEffect(() => {
    async function go() {
      const now = Date.now();

      const serviceResult = await getService({
        name: routeParams.query.service || 'none',
        environment: routeParams.query.environment || 'none',
        client: data,
        start: now - minutesToMs(15),
        end: now,
      });
      updateService(serviceResult);
    }
    go();
  }, [data, routeParams.query]);

  if (service === null || !service.infrastructure) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <h1>Entities Sandbox</h1>
      <p>
        <b>Service:</b> {service.name}
      </p>
      <p>
        <b>Containers:</b>
      </p>
      {service.infrastructure.containerIds.map((id) => (
        <p key={id}>{id}</p>
      ))}
      <p>
        <b>Hosts:</b>
      </p>
      {service.infrastructure.hostNames.map((host) => (
        <p key={host}>{host}</p>
      ))}
      <p>
        <b>Pods:</b>
      </p>
      {service.infrastructure.podNames.map((pod) => (
        <p key={pod}>{pod}</p>
      ))}
      <pre>
        <code>{JSON.stringify(service, null, 2)}</code>
      </pre>
    </>
  );
}
