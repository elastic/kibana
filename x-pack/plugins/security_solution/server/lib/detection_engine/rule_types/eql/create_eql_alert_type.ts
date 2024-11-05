/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQL_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';

import { SERVER_APP_ID } from '../../../../../common/constants';
import { EqlRuleParams } from '../../rule_schema';
import { eqlExecutor } from './eql';
import type { CreateRuleOptions, SecurityAlertType, SignalSource, SignalSourceHit } from '../types';
import { validateIndexPatterns } from '../utils';
import { sequenceSuppressionTermsAndFieldsFactory } from '../utils/utils';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import {
  wrapSuppressedAlerts,
  wrapSuppressedSequenceAlerts,
} from '../utils/wrap_suppressed_alerts';
import { getIsAlertSuppressionActive } from '../utils/get_is_alert_suppression_active';
import type { WrappedEqlShellOptionalSubAlertsType } from './build_alert_group_from_sequence';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import type {
  EqlBuildingBlockFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';

export const createEqlAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<EqlRuleParams, {}, {}, 'default'> => {
  const { experimentalFeatures, version, licensing, scheduleNotificationResponseActionsService } =
    createOptions;
  return {
    id: EQL_RULE_TYPE_ID,
    name: 'Event Correlation Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return EqlRuleParams.parse(object);
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: EqlRuleParams },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          completeRule,
          tuple,
          inputIndex,
          runtimeMappings,
          ruleExecutionLogger,
          bulkCreate,
          wrapHits,
          wrapSequences,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          unprocessedExceptions,
          mergeStrategy,
          alertTimestampOverride,
          publicBaseUrl,
          alertWithSuppression,
          intendedTimestamp,
        },
        services,
        state,
        spaceId,
      } = execOptions;

      const wrapSuppressedHits = (
        events: SignalSourceHit[],
        buildReasonMessage: BuildReasonMessage
      ) =>
        wrapSuppressedAlerts({
          events,
          spaceId,
          completeRule,
          mergeStrategy,
          indicesToQuery: inputIndex,
          buildReasonMessage,
          alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl,
          primaryTimestamp,
          secondaryTimestamp,
          intendedTimestamp,
        });
      const wrapSuppressedSequences = (
        sequences: Array<EqlHitsSequence<SignalSource>>,
        buildReasonMessage: BuildReasonMessage
      ) =>
        wrapSuppressedSequenceAlerts({
          sequences,
          spaceId,
          completeRule,
          mergeStrategy,
          indicesToQuery: inputIndex,
          buildReasonMessage,
          alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl,
          primaryTimestamp,
          secondaryTimestamp,
        });
      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: completeRule.ruleParams.alertSuppression,
        licensing,
      });
      const alertGroupFromSequenceBuilder = (
        sequence: EqlHitsSequence<SignalSource>,
        buildReasonMessage: BuildReasonMessage
      ) =>
        buildAlertGroupFromSequence({
          ruleExecutionLogger,
          sequence,
          completeRule,
          mergeStrategy,
          spaceId,
          buildReasonMessage,
          indicesToQuery: inputIndex,
          alertTimestampOverride,
          applyOverrides: true,
          publicBaseUrl,
        });

      const addSequenceSuppressionTermsAndFields = (
        shellAlert: WrappedEqlShellOptionalSubAlertsType,
        buildingBlockAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>,
        buildReasonMessage: BuildReasonMessage
      ) =>
        sequenceSuppressionTermsAndFieldsFactory({
          shellAlert,
          buildingBlockAlerts,
          spaceId,
          completeRule,
          mergeStrategy,
          indicesToQuery: inputIndex,
          buildReasonMessage,
          alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl,
          primaryTimestamp,
          secondaryTimestamp,
        });
      const { result, loggedRequests } = await eqlExecutor({
        completeRule,
        tuple,
        inputIndex,
        runtimeMappings,
        ruleExecutionLogger,
        services,
        version,
        bulkCreate,
        wrapHits,
        wrapSequences,
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
        unprocessedExceptions,
        wrapSuppressedHits,
        wrapSuppressedSequences,
        alertGroupFromSequenceBuilder,
        addSequenceSuppressionTermsAndFields,
        alertTimestampOverride,
        alertWithSuppression,
        isAlertSuppressionActive,
        experimentalFeatures,
        state,
        scheduleNotificationResponseActionsService,
      });
      return { ...result, state, ...(loggedRequests ? { loggedRequests } : {}) };
    },
  };
};
