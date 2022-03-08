/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Capabilities } from 'src/core/public';
import { KibanaFeature } from '../../../../../../features/public';
import { Consumer } from '../types';

function mapAlertConsumerToKibanaFeature(consumers: AlertConsumers[]) {
  return consumers.reduce((accum: AlertConsumers[], consumer) => {
    if (consumer === AlertConsumers.OBSERVABILITY) {
      accum.push(
        ...[
          AlertConsumers.APM,
          AlertConsumers.LOGS,
          AlertConsumers.UPTIME,
          AlertConsumers.INFRASTRUCTURE,
        ]
      );
    } else {
      accum.push(consumer);
    }
    return accum;
  }, []);
}

export function getVisibleAlertConsumers(
  capabilities: Capabilities,
  kibanaFeatures: KibanaFeature[],
  consumers?: AlertConsumers[]
) {
  const toFilter = consumers
    ? mapAlertConsumerToKibanaFeature(consumers)
    : Object.values(AlertConsumers);
  return toFilter
    .filter((consumer) => {
      return capabilities[consumer]?.show;
    })
    .map((consumer) => {
      const feature = kibanaFeatures.find((kibanaFeature) => kibanaFeature.id === consumer);
      return { id: consumer, name: feature?.name } as Consumer;
    });
}
