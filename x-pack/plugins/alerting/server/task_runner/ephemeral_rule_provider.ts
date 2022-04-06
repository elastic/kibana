/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import type { Request } from '@hapi/hapi';
import { addSpaceIdToPath } from '../../../spaces/server';
import { KibanaRequest } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ErrorWithReason } from '../lib';
import {
  RawRule,
  RuleExecutionRunResult,
  RuleExecutionState,
  RuleMonitoring,
  RuleTypeRegistry,
} from '../types';
import { asOk, mapOk, promiseResult, Resultable } from '../lib/result_type';
import { EphemeralRuleTaskInstance } from './alert_task_instance';
import {
  AlertInstanceContext,
  AlertInstanceState,
  MONITORING_HISTORY_LIMIT,
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
} from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';

export const getDefaultRuleMonitoring = (): RuleMonitoring => ({
  execution: {
    history: [],
    calculated_metrics: {
      success_ratio: 0,
    },
  },
});

export interface EphemeralRuleExecutionState<Params extends RuleTypeParams>
  extends RuleExecutionState {
  rule?: SanitizedRule<Params>;
}

export class EphemeralRuleProvider<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private taskInstance: EphemeralRuleTaskInstance<Params>;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private rule: SanitizedRule<Params>;
  private apiKey: string | null;

  constructor(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    taskInstance: EphemeralRuleTaskInstance<Params>,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.taskInstance = taskInstance;
    this.rule = this.taskInstance.params.rule;
    this.apiKey = this.taskInstance.params.apiKey;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
  }

  public isEphemeralRule() {
    return true;
  }

  private getFakeKibanaRequest(spaceId: string | undefined, apiKey: RawRule['apiKey']) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const path = addSpaceIdToPath('/', spaceId);

    const fakeRequest = KibanaRequest.from({
      headers: requestHeaders,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    } as unknown as Request);

    this.context.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }

  public async updateRuleSavedObject(
    ruleId: string,
    namespace: string | undefined,
    attributes: { executionStatus?: RuleExecutionStatus; monitoring?: RuleMonitoring }
  ) {
    this.rule = { ...this.rule, ...attributes };
  }

  public async loadRuleAttributesAndRun(
    executor: (
      fakeRequest: KibanaRequest,
      apiKey: RawRule['apiKey'],
      rule: SanitizedRule<Params>
    ) => Promise<EphemeralRuleExecutionState<Params>>
  ): Promise<Resultable<RuleExecutionRunResult<EphemeralRuleExecutionState<Params>>, Error>> {
    const {
      params: { spaceId },
    } = this.taskInstance;
    const fakeRequest = this.getFakeKibanaRequest(spaceId, this.apiKey);
    const rule = this.rule;

    // Ensure API key is still valid and user has access
    try {
      if (apm.currentTransaction) {
        apm.currentTransaction.name = `Execute Alerting Rule: "${rule.name}"`;
        apm.currentTransaction.addLabels({
          alerting_rule_consumer: rule.consumer,
          alerting_rule_name: rule.name,
          alerting_rule_tags: rule.tags.join(', '),
          alerting_rule_type_id: rule.alertTypeId,
          alerting_rule_params: JSON.stringify(rule.params),
        });
      }
    } catch (err) {
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, err);
    }

    try {
      this.ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
    } catch (err) {
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err);
    }

    if (rule.monitoring) {
      if (rule.monitoring.execution.history.length >= MONITORING_HISTORY_LIMIT) {
        // Remove the first (oldest) record
        rule.monitoring.execution.history.shift();
      }
    }

    return {
      monitoring: asOk(rule.monitoring),
      state: mapOk<RuleExecutionState, EphemeralRuleExecutionState<Params>, Error>(
        (state) => asOk({ ...state, rule }),
        await promiseResult<EphemeralRuleExecutionState<Params>, Error>(
          executor(fakeRequest, this.apiKey, rule)
        )
      ),
      schedule: asOk(rule.schedule),
    };
  }

  public finalizeState(
    state: EphemeralRuleExecutionState<Params>
  ): EphemeralRuleExecutionState<Params> {
    return { ...state, rule: this.rule };
  }
}
