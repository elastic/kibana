/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ObserverCodec = t.partial({
  hostname: t.string,
  ip: t.array(t.string),
  mac: t.array(t.string),
  name: t.union([t.string, t.undefined]),
  geo: t.partial({
    name: t.string,
    continent_name: t.string,
    city_name: t.string,
    country_iso_code: t.string,
    location: t.union([
      t.string,
      t.partial({ lat: t.number, lon: t.number }),
      t.partial({ lat: t.string, lon: t.string }),
    ]),
  }),
});
