/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { EndpointDocGenerator, Event, TreeOptions } from '../generate_data';
import { firstNonNullValue } from '../models/ecs_safety_helpers';

export async function indexAlerts({
  client,
  eventIndex,
  alertIndex,
  generator,
  numAlerts,
  options = {},
}: {
  client: Client;
  eventIndex: string;
  alertIndex: string;
  generator: EndpointDocGenerator;
  numAlerts: number;
  options: TreeOptions;
}) {
  const alertGenerator = generator.alertsGenerator(numAlerts, options);
  let result = alertGenerator.next();
  while (!result.done) {
    let k = 0;
    const resolverDocs: Event[] = [];
    while (k < 1000 && !result.done) {
      resolverDocs.push(result.value);
      result = alertGenerator.next();
      k++;
    }
    const body = resolverDocs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (array: Array<Record<string, any>>, doc) => {
        let index = eventIndex;
        if (firstNonNullValue(doc.event?.kind) === 'alert') {
          index = alertIndex;
        }
        array.push({ create: { _index: index } }, doc);
        return array;
      },
      []
    );
    await client.bulk({ body, refresh: true });
  }
}
