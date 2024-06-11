/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isEmpty, uniq } from 'lodash';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { ServiceEntities } from '../get_entities';

function mergeFunc(acc: ServiceEntities[], entity: ServiceEntities) {
  return {
    serviceName: entity.serviceName,
    agentName: entity.agentName,
    dataStreams: uniq(compact([...acc.dataStreams, ...entity.dataStreams])),
    entity: {
      metrics: { ...acc.entity.metric, ...entity.entity.metrics },
      identity: {
        service: {
          name: entity.entity.identity.service.name,
          environments: uniq(
            compact([
              acc.entity.identity.service.environment,
              entity.entity.identity.service.environment,
            ])
          ),
        },
      },
    },
  };
}
export function mergeEntities({ entities }: { entities: ServiceEntities[] }) {
  const map = new Map();
  return entities.reduce((acc, entity) => {
    console.log('test');
    const existingObject = map.get(entity.serviceName);
    if (existingObject) {
      map.set(entity.serviceName, mergeFunc(acc, entity));
    } else {
      map.set(entity.serviceName, { ...entity });
    }
    return [...map.values()];
  }, new Map());
}
