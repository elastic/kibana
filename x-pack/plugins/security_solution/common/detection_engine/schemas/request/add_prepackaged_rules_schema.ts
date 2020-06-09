/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import {
  description,
  anomaly_threshold,
  filters,
  index,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  machine_learning_job_id,
  risk_score,
  MaxSignals,
  name,
  severity,
  Tags,
  To,
  type,
  Threat,
  ThrottleOrNull,
  note,
  References,
  Actions,
  Enabled,
  FalsePositives,
  From,
  Interval,
  language,
  query,
  rule_id,
  version,
} from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DefaultStringArray } from '../types/default_string_array';
import { DefaultActionsArray } from '../types/default_actions_array';
import { DefaultBooleanFalse } from '../types/default_boolean_false';
import { DefaultFromString } from '../types/default_from_string';
import { DefaultIntervalString } from '../types/default_interval_string';
import { DefaultMaxSignalsNumber } from '../types/default_max_signals_number';
import { DefaultToString } from '../types/default_to_string';
import { DefaultThreatArray } from '../types/default_threat_array';
import { DefaultThrottleNull } from '../types/default_throttle_null';
import { ListsDefaultArray, ListsDefaultArraySchema } from '../types/lists_default_array';

/**
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - output_index is not allowed (and instead the space index must be used)
 *  - immutable is forbidden but defaults to true instead of to false and it can only ever be true (This is forced directly in the route and not here)
 *  - enabled defaults to false instead of true
 *  - version is a required field that must exist
 *  - index is a required field that must exist if type !== machine_learning (Checked within the runtime type dependent system)
 */
export const addPrepackagedRulesSchema = t.intersection([
  t.exact(
    t.type({
      description,
      risk_score,
      name,
      severity,
      type,
      rule_id,
      version,
    })
  ),
  t.exact(
    t.partial({
      actions: DefaultActionsArray, // defaults to empty actions array if not set during decode
      anomaly_threshold, // defaults to undefined if not set during decode
      enabled: DefaultBooleanFalse, // defaults to false if not set during decode
      false_positives: DefaultStringArray, // defaults to empty string array if not set during decode
      filters, // defaults to undefined if not set during decode
      from: DefaultFromString, // defaults to "now-6m" if not set during decode
      index, // defaults to undefined if not set during decode
      interval: DefaultIntervalString, // defaults to "5m" if not set during decode
      query, // defaults to undefined if not set during decode
      language, // defaults to undefined if not set during decode
      saved_id, // defaults to "undefined" if not set during decode
      timeline_id, // defaults to "undefined" if not set during decode
      timeline_title, // defaults to "undefined" if not set during decode
      meta, // defaults to "undefined" if not set during decode
      machine_learning_job_id, // defaults to "undefined" if not set during decode
      max_signals: DefaultMaxSignalsNumber, // defaults to DEFAULT_MAX_SIGNALS (100) if not set during decode
      tags: DefaultStringArray, // defaults to empty string array if not set during decode
      to: DefaultToString, // defaults to "now" if not set during decode
      threat: DefaultThreatArray, // defaults to empty array if not set during decode
      throttle: DefaultThrottleNull, // defaults to "null" if not set during decode
      references: DefaultStringArray, // defaults to empty array of strings if not set during decode
      note, // defaults to "undefined" if not set during decode
      exceptions_list: ListsDefaultArray, // defaults to empty array if not set during decode
    })
  ),
]);

export type AddPrepackagedRulesSchema = t.TypeOf<typeof addPrepackagedRulesSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type AddPrepackagedRulesSchemaDecoded = Omit<
  AddPrepackagedRulesSchema,
  | 'references'
  | 'actions'
  | 'enabled'
  | 'false_positives'
  | 'from'
  | 'interval'
  | 'max_signals'
  | 'tags'
  | 'to'
  | 'threat'
  | 'throttle'
  | 'exceptions_list'
> & {
  references: References;
  actions: Actions;
  enabled: Enabled;
  false_positives: FalsePositives;
  from: From;
  interval: Interval;
  max_signals: MaxSignals;
  tags: Tags;
  to: To;
  threat: Threat;
  throttle: ThrottleOrNull;
  exceptions_list: ListsDefaultArraySchema;
};
