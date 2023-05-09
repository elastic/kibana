/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { flatMap, keys, merge } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { SearchHitsMetadata, SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertInstanceContext, AlertInstanceState } from '../types';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import {
  InitializeExecutionOpts,
  LegacyAlertsClient,
  ProcessAndLogAlertsOpts,
  UntypedAlertsClient,
} from './legacy_alerts_client';
import { Alert as LegacyAlert } from '../alert/alert';
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import { CreatePreviewAlertsClientParams, PREVIEW_CONTEXT } from '../alerts_service/alerts_service';

export const PREVIEW_COMPLETE_STATUS = 'preview-complete';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AlertsClientParams extends CreatePreviewAlertsClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

type InitializePreviewExecutionOpts = InitializeExecutionOpts & {
  rule: AADRuleData;
};

export interface AADRuleData {
  consumer: string;
  executionId: string;
  id: string;
  name: string;
  tags: string[];
  spaceId: string;
  parameters: unknown;
}
export class PreviewAlertsClient implements UntypedAlertsClient {
  private ruleTypeName: string = '';
  private ruleTypeId: string = '';
  private ruleTypeProducer: string = '';
  private rule?: AADRuleData;
  private legacyAlertsClient: LegacyAlertsClient<
    AlertInstanceState,
    AlertInstanceContext,
    string,
    string
  >;

  constructor(private readonly options: AlertsClientParams) {
    this.legacyAlertsClient = new LegacyAlertsClient<
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string
    >({
      logger: this.options.logger,
    });
  }

  public async initializeExecution(opts: InitializePreviewExecutionOpts) {
    this.rule = opts.rule;
    this.ruleTypeId = opts.ruleType.id;
    this.ruleTypeName = opts.ruleType.name;
    this.ruleTypeProducer = opts.ruleType.producer;
    await this.legacyAlertsClient.initializeExecution(opts);
  }

  public hasReachedAlertLimit(): boolean {
    return this.legacyAlertsClient.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    return this.legacyAlertsClient.checkLimitUsage();
  }

  public processAndLogAlerts(opts: ProcessAndLogAlertsOpts) {
    this.legacyAlertsClient.processAndLogAlerts(opts);
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ) {
    return this.legacyAlertsClient.getProcessedAlerts(type);
  }

  public async search(
    queryBody: SearchRequest['body']
  ): Promise<SearchHitsMetadata<unknown>['hits']> {
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern({ context: PREVIEW_CONTEXT });

    const {
      hits: { hits },
    } = await esClient.search<Alert & any>({
      index: indexTemplateAndPattern.pattern,
      body: queryBody,
    });

    return hits;
  }

  public async getAlertsToSerialize() {
    const currentTime = new Date().toISOString();

    const activeAlerts = this.legacyAlertsClient.getProcessedAlerts('active');

    const esClient = await this.options.elasticsearchClientPromise;
    const indexTemplateAndPattern = getIndexTemplateAndPattern({ context: PREVIEW_CONTEXT });

    const activeAlertsToIndex: Array<Alert & any> = [];
    for (const id of keys(activeAlerts)) {
      activeAlertsToIndex.push(
        this.formatAlert(id, activeAlerts[id] as unknown as LegacyAlert, 'active', currentTime)
      );
    }

    const previewDoneIndicator = this.formatDoneIndicator(currentTime);

    await esClient.bulk({
      refresh: 'wait_for',
      index: indexTemplateAndPattern.alias,
      require_alias: true,
      body: flatMap(
        [...activeAlertsToIndex, previewDoneIndicator].map((alert: Alert & any) => [
          {
            index: {
              _id: alert.kibana.alert.uuid,
            },
          },
          alert,
        ])
      ),
    });

    return this.legacyAlertsClient.getAlertsToSerialize();
  }

  public getExecutorServices() {
    return this.legacyAlertsClient.getExecutorServices();
  }

  public setFlapping(flappingSettings: RulesSettingsFlappingProperties) {
    return this.legacyAlertsClient.setFlapping(flappingSettings);
  }

  private formatRule(rule?: AADRuleData) {
    if (!rule) {
      return {};
    }

    return {
      kibana: {
        alert: {
          rule: {
            category: this.ruleTypeName,
            consumer: rule.consumer,
            execution: {
              uuid: rule.executionId,
            },
            name: rule.name,
            parameters: rule.parameters,
            producer: this.ruleTypeProducer,
            revision: 0,
            rule_type_id: this.ruleTypeId,
            tags: rule.tags,
            uuid: rule.id,
          },
        },
        space_ids: [rule.spaceId],
      },
    };
  }

  private formatAlert(
    id: string,
    legacyAlert: LegacyAlert,
    status: string,
    currentTime: string
  ): Alert & any {
    return merge(
      {
        '@timestamp': currentTime,
        kibana: {
          alert: {
            context: legacyAlert.getContext(),
            ...(legacyAlert.getState().duration
              ? { duration: { us: legacyAlert.getState().duration } }
              : {}),
            ...(legacyAlert.getState().end ? { end: legacyAlert.getState().end } : {}),
            flapping: legacyAlert.getFlapping(),
            flapping_history: legacyAlert.getFlappingHistory(),
            instance: {
              id,
            },
            ...(legacyAlert.getState().start ? { start: legacyAlert.getState().start } : {}),
            ...(legacyAlert.getScheduledActionOptions()?.state
              ? { state: legacyAlert.getScheduledActionOptions()?.state }
              : {}),
            status,
            uuid: legacyAlert.getUuid(),
          },
        },
      },
      this.formatRule(this.rule)
    ) as Alert & any;
  }

  private formatDoneIndicator(currentTime: string): Alert & any {
    return merge(
      {
        '@timestamp': currentTime,
        kibana: {
          alert: {
            status: PREVIEW_COMPLETE_STATUS,
          },
        },
      },
      this.formatRule(this.rule)
    ) as Alert & any;
  }
}
