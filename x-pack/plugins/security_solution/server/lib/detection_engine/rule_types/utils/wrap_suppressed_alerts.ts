/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type { SignalSourceHit } from '../types';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';

import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';
import { getSuppressionAlertFields, getSuppressionTerms } from './suppression_utils';
import type { SharedParams } from './utils';
import { generateId } from './utils';
import type { BuildReasonMessage } from './reason_formatters';

/**
 * wraps suppressed alerts
 * creates instanceId hash, which is used to search on time interval alerts
 * populates alert's suppression fields
 */
export const wrapSuppressedAlerts = ({
  events,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  buildReasonMessage,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  primaryTimestamp,
  secondaryTimestamp,
  intendedTimestamp,
}: {
  events: SignalSourceHit[];
  buildReasonMessage: BuildReasonMessage;
} & SharedParams): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  return events.map((event) => {
    const suppressionTerms = getSuppressionTerms({
      alertSuppression: completeRule?.ruleParams?.alertSuppression,
      input: event.fields,
    });

    const id = generateId(
      event._index,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event._id!,
      String(event._version),
      `${spaceId}:${completeRule.alertId}`
    );

    const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);

    const baseAlert: BaseFieldsLatest = transformHitToAlert({
      spaceId,
      completeRule,
      doc: event,
      mergeStrategy,
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage,
      indicesToQuery,
      alertTimestampOverride,
      ruleExecutionLogger,
      alertUuid: id,
      publicBaseUrl,
      intendedTimestamp,
    });

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        ...getSuppressionAlertFields({
          primaryTimestamp,
          secondaryTimestamp,
          fields: event.fields,
          suppressionTerms,
          fallbackTimestamp: baseAlert[TIMESTAMP],
          instanceId,
        }),
      },
    };
  });
};
