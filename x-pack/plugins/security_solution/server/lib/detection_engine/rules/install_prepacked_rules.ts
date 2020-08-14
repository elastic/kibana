/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { Alert } from '../../../../../alerts/common';
import { AlertsClient } from '../../../../../alerts/server';
import { createRules } from './create_rules';
import { PartialFilter } from '../types';

export const installPrepackagedRules = (
  alertsClient: AlertsClient,
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string
): Array<Promise<Alert>> =>
  rules.reduce<Array<Promise<Alert>>>((acc, rule) => {
    const {
      anomaly_threshold: anomalyThreshold,
      author,
      building_block_type: buildingBlockType,
      description,
      enabled,
      false_positives: falsePositives,
      from,
      query,
      language,
      license,
      machine_learning_job_id: machineLearningJobId,
      saved_id: savedId,
      timeline_id: timelineId,
      timeline_title: timelineTitle,
      meta,
      filters: filtersObject,
      rule_id: ruleId,
      index,
      interval,
      max_signals: maxSignals,
      risk_score: riskScore,
      risk_score_mapping: riskScoreMapping,
      rule_name_override: ruleNameOverride,
      name,
      severity,
      severity_mapping: severityMapping,
      tags,
      to,
      type,
      threat,
      threshold,
      timestamp_override: timestampOverride,
      references,
      note,
      version,
      exceptions_list: exceptionsList,
    } = rule;
    // TODO: Fix these either with an is conversion or by better typing them within io-ts
    const filters: PartialFilter[] | undefined = filtersObject as PartialFilter[];

    return [
      ...acc,
      createRules({
        alertsClient,
        anomalyThreshold,
        author,
        buildingBlockType,
        description,
        enabled,
        falsePositives,
        from,
        immutable: true, // At the moment we force all prepackaged rules to be immutable
        query,
        language,
        license,
        machineLearningJobId,
        outputIndex,
        savedId,
        timelineId,
        timelineTitle,
        meta,
        filters,
        ruleId,
        index,
        interval,
        maxSignals,
        riskScore,
        riskScoreMapping,
        ruleNameOverride,
        name,
        severity,
        severityMapping,
        tags,
        to,
        type,
        threat,
        threshold,
        timestampOverride,
        references,
        note,
        version,
        exceptionsList,
        actions: [], // At this time there is no pre-packaged actions
      }),
    ];
  }, []);
