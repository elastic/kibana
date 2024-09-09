/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

import { ALERT_BUILDING_BLOCK_TYPE, ALERT_URL, ALERT_UUID, TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';

import type { Ancestor, SignalSource, SignalSourceHit } from '../types';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type {
  CompleteRule,
  EqlRuleParams,
  MachineLearningRuleParams,
  ThreatRuleParams,
} from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import { getSuppressionAlertFields, getSuppressionTerms } from './suppression_utils';
import { generateId } from './utils';
import { generateBuildingBlockIds } from '../factories/utils/generate_building_block_ids';

import type { BuildReasonMessage } from './reason_formatters';
import { buildAlertRoot } from '../eql/build_alert_group_from_sequence';
import { getAlertDetailsUrl } from '@kbn/security-solution-plugin/common/utils/alert_detail_path';
import { DEFAULT_ALERTS_INDEX } from '@kbn/security-solution-plugin/common/constants';
import {
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { buildAncestors } from '../factories/utils/build_alert';

type RuleWithInMemorySuppression = ThreatRuleParams | EqlRuleParams | MachineLearningRuleParams;

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
}: {
  events: SignalSourceHit[];
  spaceId: string;
  completeRule: CompleteRule<RuleWithInMemorySuppression>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  return events.map((event) => {
    const suppressionTerms = getSuppressionTerms({
      alertSuppression: completeRule?.ruleParams?.alertSuppression,
      fields: event.fields,
    });

    const id = generateId(
      event._index,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event._id!,
      String(event._version),
      `${spaceId}:${completeRule.alertId}`
    );

    const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);

    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      event,
      mergeStrategy,
      [],
      true,
      buildReasonMessage,
      indicesToQuery,
      alertTimestampOverride,
      ruleExecutionLogger,
      id,
      publicBaseUrl
    );

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

/**
 * wraps suppressed alerts
 * creates instanceId hash, which is used to search on time interval alerts
 * populates alert's suppression fields
 */
export const wrapSuppressedSequenceAlerts = ({
  sequences,
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
}: {
  sequences: Array<EqlHitsSequence<SignalSource>>;
  spaceId: string;
  completeRule: CompleteRule<RuleWithInMemorySuppression>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  // objective here is to replicate what is happening
  // in x-pack/plugins/security_solution/server/lib/detection_engine/rule_types/eql/build_alert_group_from_sequence.ts
  //
  return sequences.reduce(
    (acc: Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>, sequence) => {
      const fields = sequence.events?.reduce(
        (seqAcc, event) => ({ ...seqAcc, ...event.fields }),
        {} as Record<string, unknown>
      );
      const suppressionTerms = getSuppressionTerms({
        alertSuppression: completeRule?.ruleParams?.alertSuppression,
        fields,
      });
      const ancestors: Ancestor[] = sequence.events.flatMap((event) => buildAncestors(event));
      if (ancestors.some((ancestor) => ancestor?.rule === completeRule.alertId)) {
        return [];
      }

      console.error('CALLING WITHIN WRAP SUPPRESSED SEQUENCE ALERTS');
      // The "building block" alerts start out as regular BaseFields.
      // We'll add the group ID and index fields
      // after creating the shell alert later on
      // since that's when the group ID is determined.
      const baseAlerts = sequence.events.map((event) =>
        buildBulkBody(
          spaceId,
          completeRule,
          event,
          mergeStrategy,
          [],
          true,
          buildReasonMessage,
          indicesToQuery,
          alertTimestampOverride,
          ruleExecutionLogger,
          'placeholder-alert-uuid', // This is overriden below
          publicBaseUrl
        )
      );

      const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);
      console.error('sequence alert INSTANCE ID', instanceId);

      // The ID of each building block alert depends on all of the other building blocks as well,
      // so we generate the IDs after making all the BaseFields
      const buildingBlockIds = generateBuildingBlockIds(baseAlerts);
      const wrappedBaseFields: Array<WrappedFieldsLatest<BaseFieldsLatest>> = baseAlerts.map(
        (block, i): WrappedFieldsLatest<BaseFieldsLatest> => ({
          _id: buildingBlockIds[i],
          _index: '',
          _source: {
            ...block,
            [ALERT_UUID]: buildingBlockIds[i],
          },
        })
      );

      // Now that we have an array of building blocks for the events in the sequence,
      // we can build the signal that links the building blocks together
      // and also insert the group id (which is also the "shell" signal _id) in each building block
      const shellAlert = buildAlertRoot(
        wrappedBaseFields,
        completeRule,
        spaceId,
        buildReasonMessage,
        indicesToQuery,
        alertTimestampOverride,
        publicBaseUrl
      );
      const sequenceAlert = {
        _id: shellAlert[ALERT_UUID],
        _index: '',
        _source: {
          ...shellAlert,
          ...getSuppressionAlertFields({
            primaryTimestamp,
            secondaryTimestamp,
            fields,
            suppressionTerms,
            fallbackTimestamp: baseAlerts?.[0][TIMESTAMP],
            instanceId,
          }),
        },
      };

      // Finally, we have the group id from the shell alert so we can convert the BaseFields into EqlBuildingBlocks
      const wrappedBuildingBlocks = wrappedBaseFields.map((block, i) => {
        const alertUrl = getAlertDetailsUrl({
          alertId: block._id,
          index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
          timestamp: block._source['@timestamp'],
          basePath: publicBaseUrl,
          spaceId,
        });

        return {
          ...block,
          _source: {
            ...block._source,
            [ALERT_BUILDING_BLOCK_TYPE]: 'default',
            [ALERT_GROUP_ID]: shellAlert[ALERT_GROUP_ID],
            [ALERT_GROUP_INDEX]: i,
            [ALERT_URL]: alertUrl,
          },
        };
      });

      return [...acc, ...wrappedBuildingBlocks, sequenceAlert] as Array<
        WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>
      >;
    },
    [] as Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>
  );
};
