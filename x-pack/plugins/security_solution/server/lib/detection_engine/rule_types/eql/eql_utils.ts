/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type {
  BaseFieldsLatest,
  EqlBuildingBlockFieldsLatest,
  EqlShellFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import type { RuleWithInMemorySuppression } from '../utils/utils';
import { sequenceSuppressionTermsAndFieldsFactory } from '../utils/utils';
import type {
  BuildAlertGroupFromSequenceReturnType,
  WrappedEqlShellOptionalSubAlertsType,
} from './build_alert_group_from_sequence';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import type { SignalSource, SignalSourceHit } from '../types';
import { wrapSuppressedAlerts } from '../utils/wrap_suppressed_alerts';
import type { CompleteRule } from '../../rule_schema';
import type { ConfigType } from '../../../../config';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

interface ConstructorParams {
  spaceId: string;
  completeRule: CompleteRule<RuleWithInMemorySuppression>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  intendedTimestamp?: Date;
}

/**
 * Interface for EqlUtils
 */
export interface IEqlUtils {
  wrapSuppressedHits(
    events: SignalSourceHit[],
    buildReasonMessage: BuildReasonMessage
  ): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>;
  alertGroupFromSequenceBuilder(
    sequence: EqlHitsSequence<SignalSource>,
    buildReasonMessage: BuildReasonMessage
  ): BuildAlertGroupFromSequenceReturnType;
  addSequenceSuppressionTermsAndFields(
    shellAlert: WrappedEqlShellOptionalSubAlertsType,
    buildingBlockAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>,
    buildReasonMessage: BuildReasonMessage
  ): WrappedFieldsLatest<EqlShellFieldsLatest & SuppressionFieldsLatest> & {
    subAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>;
  };
}

export class EqlUtils implements IEqlUtils {
  #spaceId: string;
  #completeRule: CompleteRule<RuleWithInMemorySuppression>;
  #mergeStrategy: ConfigType['alertMergeStrategy'];
  #indicesToQuery: string[];
  #alertTimestampOverride: Date | undefined;
  #ruleExecutionLogger: IRuleExecutionLogForExecutors;
  #publicBaseUrl: string | undefined;
  #primaryTimestamp: string;
  #secondaryTimestamp: string | undefined;
  #intendedTimestamp: Date | undefined;
  constructor({
    spaceId,
    completeRule,
    mergeStrategy,
    indicesToQuery,
    alertTimestampOverride,
    ruleExecutionLogger,
    publicBaseUrl,
    primaryTimestamp,
    secondaryTimestamp,
    intendedTimestamp,
  }: ConstructorParams) {
    this.#spaceId = spaceId;
    this.#completeRule = completeRule;
    this.#mergeStrategy = mergeStrategy;
    this.#indicesToQuery = indicesToQuery;
    this.#alertTimestampOverride = alertTimestampOverride;
    this.#ruleExecutionLogger = ruleExecutionLogger;
    this.#publicBaseUrl = publicBaseUrl;
    this.#primaryTimestamp = primaryTimestamp;
    this.#secondaryTimestamp = secondaryTimestamp;
    this.#intendedTimestamp = intendedTimestamp;
  }

  public wrapSuppressedHits(events: SignalSourceHit[], buildReasonMessage: BuildReasonMessage) {
    return wrapSuppressedAlerts({
      events,
      buildReasonMessage,
      spaceId: this.#spaceId,
      completeRule: this.#completeRule,
      mergeStrategy: this.#mergeStrategy,
      indicesToQuery: this.#indicesToQuery,
      alertTimestampOverride: this.#alertTimestampOverride,
      ruleExecutionLogger: this.#ruleExecutionLogger,
      publicBaseUrl: this.#publicBaseUrl,
      primaryTimestamp: this.#primaryTimestamp,
      secondaryTimestamp: this.#secondaryTimestamp,
      intendedTimestamp: this.#intendedTimestamp,
    });
  }

  public alertGroupFromSequenceBuilder(
    sequence: EqlHitsSequence<SignalSource>,
    buildReasonMessage: BuildReasonMessage
  ) {
    return buildAlertGroupFromSequence({
      sequence,
      buildReasonMessage,
      applyOverrides: true,
      spaceId: this.#spaceId,
      completeRule: this.#completeRule,
      mergeStrategy: this.#mergeStrategy,
      indicesToQuery: this.#indicesToQuery,
      alertTimestampOverride: this.#alertTimestampOverride,
      ruleExecutionLogger: this.#ruleExecutionLogger,
      publicBaseUrl: this.#publicBaseUrl,
    });
  }

  public addSequenceSuppressionTermsAndFields(
    shellAlert: WrappedEqlShellOptionalSubAlertsType,
    buildingBlockAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>,
    buildReasonMessage: BuildReasonMessage
  ) {
    return sequenceSuppressionTermsAndFieldsFactory({
      shellAlert,
      buildingBlockAlerts,
      spaceId: this.#spaceId,
      completeRule: this.#completeRule,
      mergeStrategy: this.#mergeStrategy,
      indicesToQuery: this.#indicesToQuery,
      buildReasonMessage,
      alertTimestampOverride: this.#alertTimestampOverride,
      ruleExecutionLogger: this.#ruleExecutionLogger,
      publicBaseUrl: this.#publicBaseUrl,
      primaryTimestamp: this.#primaryTimestamp,
      secondaryTimestamp: this.#secondaryTimestamp,
    });
  }
}
