/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import objectHash from 'object-hash';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type {
  BaseFieldsLatest,
  NewTermsFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../../common/detection_engine/schemas/alerts';
import { ALERT_NEW_TERMS } from '../../../../../../common/field_maps/field_names';
import type { ConfigType } from '../../../../../config';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../../../signals/reason_formatters';
import type { SignalSource } from '../../../signals/types';
import { buildBulkBody } from './build_bulk_body';

export interface EventsAndTerms {
  event: estypes.SearchHit<SignalSource>;
  newTerms: Array<string | number | null>;
}

export const wrapNewTermsAlerts = ({
  eventsAndTerms,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
}: {
  eventsAndTerms: EventsAndTerms[];
  spaceId: string | null | undefined;
  completeRule: CompleteRule<RuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
}): Array<WrappedFieldsLatest<NewTermsFieldsLatest>> => {
  return eventsAndTerms.map((eventAndTerms) => {
    const id = objectHash([
      eventAndTerms.event._index,
      eventAndTerms.event._id,
      String(eventAndTerms.event._version),
      `${spaceId}:${completeRule.alertId}`,
      eventAndTerms.newTerms,
    ]);
    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      eventAndTerms.event,
      mergeStrategy,
      [],
      true,
      buildReasonMessageForNewTermsAlert,
      indicesToQuery
    );
    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_NEW_TERMS]: eventAndTerms.newTerms,
        [ALERT_UUID]: id,
      },
    };
  });
};
