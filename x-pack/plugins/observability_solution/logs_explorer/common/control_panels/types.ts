/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

const PanelRT = rt.type({
  order: rt.number,
  width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
  grow: rt.boolean,
  type: rt.string,
  explicitInput: rt.intersection([
    rt.type({ id: rt.string }),
    rt.partial({
      dataViewId: rt.string,
      exclude: rt.boolean,
      existsSelected: rt.boolean,
      fieldName: rt.string,
      selectedOptions: rt.array(rt.string),
      title: rt.union([rt.string, rt.undefined]),
    }),
  ]),
});

export const ControlPanelRT = rt.record(rt.string, PanelRT);

export type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;
