/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import type { Request } from '@hapi/hapi';
import { PublicMethodsOf } from '@kbn/utility-types';
import { addSpaceIdToPath } from '../../../spaces/server';
import { KibanaRequest, Logger } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ErrorWithReason, ruleExecutionStatusToRaw } from '../lib';
import {
  RawRule,
  RuleExecutionRunResult,
  RuleExecutionState,
  RuleMonitoring,
  RuleTypeRegistry,
} from '../types';
import { asOk, promiseResult, Resultable } from '../lib/result_type';
import { partiallyUpdateAlert } from '../saved_objects';
import { AlertInstanceContext, AlertInstanceState, MONITORING_HISTORY_LIMIT } from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';
import { RuleTaskInstance } from './types';
import {
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
} from '../../common/rule';

export const getDefaultRuleMonitoring = (): RuleMonitoring => ({
  execution: {
    history: [],
    calculated_metrics: {
      success_ratio: 0,
    },
  },
});

export type RuleProvider<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = PublicMethodsOf<
  ConcreteRuleProvider<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
>;

export class ConcreteRuleProvider<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private readonly ruleTypeRegistry: RuleTypeRegistry;

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
    taskInstance: RuleTaskInstance,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.logger = context.logger;
    this.ruleType = ruleType;
    this.taskInstance = taskInstance;
    this.ruleTypeRegistry = context.ruleTypeRegistry;
  }

  public isEphemeralRule() {
    return false;
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

  private async getDecryptedAttributes(
    ruleId: string,
    spaceId: string | undefined
  ): Promise<{ apiKey: string | null; enabled: boolean; consumer: string }> {
    const namespace = this.context.spaceIdToNamespace(spaceId);
    // Only fetch encrypted attributes here, we'll create a saved objects client
    // scoped with the API key to fetch the remaining data.
    const {
      attributes: { apiKey, enabled, consumer },
    } = await this.context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
      'alert',
      ruleId,
      { namespace }
    );

    return { apiKey, enabled, consumer };
  }

  public async updateRuleSavedObject(
    ruleId: string,
    namespace: string | undefined,
    {
      executionStatus,
      monitoring,
    }: { executionStatus?: RuleExecutionStatus; monitoring?: RuleMonitoring }
  ) {
    const client = this.context.internalSavedObjectsRepository;

    try {
      await partiallyUpdateAlert(
        client,
        ruleId,
        {
          ...(executionStatus
            ? { executionStatus: ruleExecutionStatusToRaw(executionStatus) }
            : {}),
          ...(monitoring ? { monitoring } : {}),
        },
        {
          ignore404: true,
          namespace,
          refresh: false,
        }
      );
    } catch (err) {
      this.logger.error(`error updating rule for ${this.ruleType.id}:${ruleId} ${err.message}`);
    }
  }

  public async loadRuleAttributesAndRun(
    executor: (
      fakeRequest: KibanaRequest,
      apiKey: RawRule['apiKey'],
      rule: SanitizedRule<Params>
    ) => Promise<RuleExecutionState>
  ): Promise<Resultable<RuleExecutionRunResult, Error>> {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;
    let enabled: boolean;
    let apiKey: string | null;
    try {
      const decryptedAttributes = await this.getDecryptedAttributes(ruleId, spaceId);
      apiKey = decryptedAttributes.apiKey;
      enabled = decryptedAttributes.enabled;
    } catch (err) {
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err);
    }

    if (!enabled) {
      throw new ErrorWithReason(
        RuleExecutionStatusErrorReasons.Disabled,
        new Error(`Rule failed to execute because rule ran after it was disabled.`)
      );
    }

    const fakeRequest = this.getFakeKibanaRequest(spaceId, apiKey);

    // Get rules client with space level permissions
    const rulesClient = this.context.getRulesClientWithRequest(fakeRequest);

    let rule: SanitizedRule<Params>;

    // Ensure API key is still valid and user has access
    try {
      rule = await rulesClient.get({ id: ruleId });

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
      state: await promiseResult<RuleExecutionState, Error>(executor(fakeRequest, apiKey, rule)),
      schedule: asOk(
        // fetch the rule again to ensure we return the correct schedule as it may have
        // changed during the task execution
        (await rulesClient.get({ id: ruleId })).schedule
      ),
    };
  }
}
