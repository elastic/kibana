/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

const dataTypeRT = rt.keyof({
  logs: null,
  unknown: null,
});

export const explorerDataViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      name: rt.union([rt.string, rt.undefined]),
      title: rt.string,
      dataType: dataTypeRT,
    }),
    rt.partial({
      namespaces: rt.union([rt.array(rt.string), rt.undefined]),
      type: rt.union([rt.string, rt.undefined]),
    }),
  ])
);

export type ExplorerDataViewId = `explorer-dataview-${string}`;
export type ExplorerDataViewType = rt.TypeOf<typeof explorerDataViewRT>;
