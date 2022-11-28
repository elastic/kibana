/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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
export const schemaUnknown = rt.unknown;
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
export const schemaStringOrNumber = rt.union([schemaString, schemaNumber]);
export const schemaBoolean = rt.boolean;
export const schemaBooleanArray = rt.array(schemaBoolean);

export const AlertSchema = rt.exact(
  rt.partial({
    anomaly: rt.exact(
      rt.partial({
        bucket_span: rt.exact(
          rt.partial({
            minutes: schemaString,
          })
        ),
        start: schemaString,
      })
    ),
    kibana: rt.exact(
      rt.partial({
        alert: rt.exact(
          rt.partial({
            action_group: schemaString,
            ancestors: rt.array(
              rt.exact(
                rt.partial({
                  depth: schemaNumber,
                  id: schemaString,
                  index: schemaString,
                  rule: schemaString,
                  type: schemaString,
                })
              )
            ),
            depth: schemaNumber,
            duration: rt.exact(
              rt.partial({
                us: schemaStringOrNumber,
              })
            ),
            end: schemaDate,
            evaluation_results: rt.array(
              rt.exact(
                rt.partial({
                  thresholds: rt.array(
                    rt.exact(
                      rt.partial({
                        comparator: schemaString,
                        type: schemaString,
                        value: schemaString,
                      })
                    )
                  ),
                  value: schemaNumber,
                })
              )
            ),
            flapping: schemaBoolean,
            group: rt.exact(
              rt.partial({
                id: schemaString,
                index: schemaNumber,
              })
            ),
            id: schemaString,
            new_terms: schemaStringArray,
            original_event: rt.exact(
              rt.partial({
                action: schemaString,
                agent_id_status: schemaString,
                category: schemaString,
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
                sequence: schemaNumber,
                severity: schemaNumber,
                start: schemaDate,
                timezone: schemaString,
                type: schemaString,
                url: schemaString,
              })
            ),
            original_time: schemaDate,
            reason: schemaString,
            risk_score: schemaNumber,
            rule: rt.exact(
              rt.partial({
                category: schemaString,
                consumer: schemaString,
                execution: rt.exact(
                  rt.partial({
                    uuid: schemaString,
                  })
                ),
                name: schemaString,
                parameters: schemaUnknown,
                producer: schemaString,
                rule_type_id: schemaString,
                tags: schemaStringArray,
                uuid: schemaString,
              })
            ),
            severity: schemaString,
            start: schemaDate,
            status: schemaString,
            threshold_result: rt.array(
              rt.exact(
                rt.partial({
                  cardinality: rt.exact(
                    rt.partial({
                      field: schemaString,
                      value: schemaNumber,
                    })
                  ),
                  count: schemaNumber,
                  from: schemaDate,
                  terms: rt.array(
                    rt.exact(
                      rt.partial({
                        field: schemaString,
                        value: schemaString,
                      })
                    )
                  ),
                })
              )
            ),
            time_range: rt.exact(
              rt.partial({
                gte: schemaDate,
                lte: schemaDate,
              })
            ),
            uuid: schemaString,
            workflow_status: schemaString,
          })
        ),
        space_ids: schemaStringArray,
        version: schemaString,
      })
    ),
    monitor: rt.exact(
      rt.partial({
        id: schemaString,
        name: schemaString,
        type: schemaString,
      })
    ),
    processor: rt.exact(
      rt.partial({
        event: schemaString,
      })
    ),
    transaction: rt.exact(
      rt.partial({
        name: schemaString,
        type: schemaString,
      })
    ),
  })
);

export type Alert = rt.TypeOf<typeof AlertSchema>;
