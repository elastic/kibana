/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RowRenderer } from '../row_renderer';

export const resolverRowRenderer: RowRenderer = {
  isInstance(ecs) {
    // TODO, what should the logic here be? Show if its a legacy endgame event, or if its a process event with an entity_id?
    // TODO, is `category` guaranteed to be an array?
    // TODO, ECS docs don't indicate that event.kind is an array: https://github.com/elastic/ecs/blob/6ca4da1d5c75c217f134a5c39cc9be281d2f1953/schemas/event.yml#L41
    // TODO, we have our own ECS type (which isn't used in the endpoint code), shouldn't this be provided by ECS somehow?
    // TODO, shouldn't we use some runtime type system for this? We can't rely on ECS since users can modify the data. right?

    // return true if its a process event with an entity_id. This is the minimum data required to call resolver APIs

    const welp1 = ecs.event?.category?.includes('process');
    const welp2 = ecs.event?.kind?.includes('event');
    const welp3 = 'entity_id' in ecs.process;

    const welp =
      ecs.event?.category?.includes('process') &&
      ecs.event?.kind?.includes('event') &&
      'entity_id' in ecs.process;

    console.log('welp1', welp1, 'welp2', welp2, 'welp3', welp3, 'welp', welp, ecs);

    return welp;

    // TODO, should we handle the 'legacy' event case?
  },
  renderRow({ browserFields, data, timelineId }) {
    console.log('rendered!');
    return <span>its resolver time</span>;
  },
};
