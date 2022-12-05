/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

import { Either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';

const ISO_DATE_PATTERN = /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}.d{3}Z$/;

export const IsoDateString = new rt.Type<string, string, unknown>(
  'IsoDateString',
  rt.string.is,
  (input, context): Either<rt.Errors, string> => {
    if (typeof input === 'string' && ISO_DATE_PATTERN.test(input)) {
      return rt.success(input);
    } else {
      return rt.failure(input, context);
    }
  },
  rt.identity
);

export type IsoDateStringC = typeof IsoDateString;

export const schemaDate = IsoDateString;
export const schemaDateArray = rt.array(IsoDateString);
export const schemaDateRange = rt.partial({
  gte: schemaDate,
  lte: schemaDate,
});
export const schemaDateRangeArray = rt.array(schemaDateRange);
export const schemaUnknown = rt.unknown;
export const schemaUnknownArray = rt.array(rt.unknown);
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
export const schemaStringOrNumber = rt.union([schemaString, schemaNumber]);
export const schemaStringOrNumberArray = rt.array(schemaStringOrNumber);
export const schemaBoolean = rt.boolean;
export const schemaBooleanArray = rt.array(schemaBoolean);
const schemaGeoPointCoords = rt.type({
  type: schemaString,
  coordinates: schemaNumberArray,
});
const schemaGeoPointString = schemaString;
const schemaGeoPointLatLon = rt.type({
  lat: schemaNumber,
  lon: schemaNumber,
});
const schemaGeoPointLocation = rt.type({
  location: schemaNumberArray,
});
const schemaGeoPointLocationString = rt.type({
  location: schemaString,
});
export const schemaGeoPoint = rt.union([
  schemaGeoPointCoords,
  schemaGeoPointString,
  schemaGeoPointLatLon,
  schemaGeoPointLocation,
  schemaGeoPointLocationString,
]);
export const schemaGeoPointArray = rt.array(schemaGeoPoint);

const AlertRequiredSchema = rt.type({
  kibana: rt.type({
    alert: rt.type({
      id: schemaString,
      rule: rt.type({
        category: schemaString,
        consumer: schemaString,
        name: schemaString,
        producer: schemaString,
        rule_type_id: schemaString,
        uuid: schemaString,
      }),
      status: schemaString,
      uuid: schemaString,
    }),
    space_ids: schemaStringArray,
  }),
});
const AlertOptionalSchema = rt.partial({
  anomaly: rt.partial({
    bucket_span: rt.partial({
      minutes: schemaString,
    }),
    start: schemaString,
  }),
  kibana: rt.partial({
    alert: rt.partial({
      action_group: schemaString,
      ancestors: rt.array(
        rt.partial({
          depth: schemaStringOrNumber,
          id: schemaString,
          index: schemaString,
          rule: schemaString,
          type: schemaString,
        })
      ),
      depth: schemaStringOrNumber,
      duration: rt.partial({
        us: schemaStringOrNumber,
      }),
      end: schemaDate,
      evaluation_results: rt.array(
        rt.partial({
          thresholds: rt.partial({
            comparator: schemaString,
            type: schemaString,
            value: schemaStringArray,
          }),
          value: schemaNumber,
        })
      ),
      flapping: schemaBoolean,
      group: rt.partial({
        id: schemaString,
        index: schemaNumber,
      }),
      new_terms: schemaStringArray,
      original_event: rt.partial({
        action: schemaString,
        agent_id_status: schemaString,
        category: schemaStringArray,
        code: schemaString,
        created: schemaDate,
        dataset: schemaString,
        duration: schemaString,
        end: schemaDate,
        hash: schemaString,
        id: schemaString,
        ingested: schemaDate,
        kind: schemaString,
        module: schemaString,
        original: schemaString,
        outcome: schemaString,
        provider: schemaString,
        reason: schemaString,
        reference: schemaString,
        risk_score: schemaNumber,
        risk_score_norm: schemaNumber,
        sequence: schemaStringOrNumber,
        severity: schemaStringOrNumber,
        start: schemaDate,
        timezone: schemaString,
        type: schemaStringArray,
        url: schemaString,
      }),
      original_time: schemaDate,
      reason: schemaString,
      risk_score: schemaNumber,
      rule: rt.partial({
        execution: rt.partial({
          uuid: schemaString,
        }),
        parameters: schemaUnknown,
        tags: schemaStringArray,
      }),
      severity: schemaString,
      start: schemaDate,
      threshold_result: rt.partial({
        count: schemaStringOrNumber,
        from: schemaDate,
        terms: rt.array(
          rt.partial({
            field: schemaString,
            value: schemaString,
          })
        ),
      }),
      time_range: schemaDateRange,
      workflow_status: schemaString,
    }),
    version: schemaString,
  }),
  monitor: rt.partial({
    id: schemaString,
    name: schemaString,
    type: schemaString,
  }),
  processor: rt.partial({
    event: schemaString,
  }),
  transaction: rt.partial({
    name: schemaString,
    type: schemaString,
  }),
});

export const AlertSchema = rt.intersection([AlertRequiredSchema, AlertOptionalSchema]);

export type Alert = rt.TypeOf<typeof AlertSchema>;
