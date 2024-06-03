/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const directionRT = rt.keyof({
  asc: null,
  desc: null,
});

export const sortRT = rt.strict({
  field: rt.string,
  direction: directionRT,
});

export const tableRT = rt.exact(
  rt.partial({
    page: rt.number,
    rowsPerPage: rt.number,
    sort: sortRT,
  })
);

const integrationRT = rt.strict({
  name: rt.string,
  title: rt.string,
  version: rt.string,
});

const datasetRT = rt.intersection([
  rt.strict({
    rawName: rt.string,
    type: rt.string,
    name: rt.string,
    namespace: rt.string,
    title: rt.string,
  }),
  rt.exact(
    rt.partial({
      integration: integrationRT,
    })
  ),
]);

const timeRangeRT = rt.strict({
  from: rt.string,
  to: rt.string,
  refresh: rt.strict({
    pause: rt.boolean,
    value: rt.number,
  }),
});

const degradedFieldRT = rt.exact(
  rt.partial({
    table: tableRT,
  })
);

export const flyoutRT = rt.exact(
  rt.partial({
    dataset: datasetRT,
    insightsTimeRange: timeRangeRT,
    breakdownField: rt.string,
    degradedFields: degradedFieldRT,
  })
);

export const filtersRT = rt.exact(
  rt.partial({
    inactive: rt.boolean,
    fullNames: rt.boolean,
    timeRange: timeRangeRT,
    integrations: rt.array(rt.string),
    namespaces: rt.array(rt.string),
    qualities: rt.array(rt.union([rt.literal('poor'), rt.literal('degraded'), rt.literal('good')])),
    query: rt.string,
  })
);

export const urlSchemaRT = rt.exact(
  rt.partial({
    v: rt.literal(1),
    table: tableRT,
    flyout: flyoutRT,
    filters: filtersRT,
  })
);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
