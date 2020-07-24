/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has, isEmpty } from 'lodash/fp';
import moment from 'moment';
import deepmerge from 'deepmerge';

import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../common/constants';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import { RuleType } from '../../../../../../common/detection_engine/types';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { ENDPOINT_LIST_ID } from '../../../../../shared_imports';
import { NewRule } from '../../../../containers/detection_engine/rules';

import {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  ActionsStepRuleJson,
} from '../types';

export const getTimeTypeValue = (time: string): { unit: string; value: number } => {
  const timeObj = {
    unit: '',
    value: 0,
  };
  const filterTimeVal = (time as string).match(/\d+/g);
  const filterTimeType = (time as string).match(/[a-zA-Z]+/g);
  if (!isEmpty(filterTimeVal) && filterTimeVal != null && !isNaN(Number(filterTimeVal[0]))) {
    timeObj.value = Number(filterTimeVal[0]);
  }
  if (
    !isEmpty(filterTimeType) &&
    filterTimeType != null &&
    ['s', 'm', 'h'].includes(filterTimeType[0])
  ) {
    timeObj.unit = filterTimeType[0];
  }
  return timeObj;
};

export interface RuleFields {
  anomalyThreshold: unknown;
  machineLearningJobId: unknown;
  queryBar: unknown;
  index: unknown;
  ruleType: unknown;
  threshold?: unknown;
}
type QueryRuleFields<T> = Omit<T, 'anomalyThreshold' | 'machineLearningJobId' | 'threshold'>;
type ThresholdRuleFields<T> = Omit<T, 'anomalyThreshold' | 'machineLearningJobId'>;
type MlRuleFields<T> = Omit<T, 'queryBar' | 'index'>;

const isMlFields = <T>(
  fields: QueryRuleFields<T> | MlRuleFields<T> | ThresholdRuleFields<T>
): fields is MlRuleFields<T> => has('anomalyThreshold', fields);

const isThresholdFields = <T>(
  fields: QueryRuleFields<T> | MlRuleFields<T> | ThresholdRuleFields<T>
): fields is ThresholdRuleFields<T> => has('threshold', fields);

export const filterRuleFieldsForType = <T extends RuleFields>(fields: T, type: RuleType) => {
  if (isMlRule(type)) {
    const { index, queryBar, ...mlRuleFields } = fields;
    return mlRuleFields;
  } else if (type === 'threshold') {
    const { anomalyThreshold, machineLearningJobId, ...thresholdRuleFields } = fields;
    return thresholdRuleFields;
  } else {
    const { anomalyThreshold, machineLearningJobId, threshold, ...queryRuleFields } = fields;
    return queryRuleFields;
  }
};

export const formatDefineStepData = (defineStepData: DefineStepRule): DefineStepRuleJson => {
  const ruleFields = filterRuleFieldsForType(defineStepData, defineStepData.ruleType);
  const { ruleType, timeline } = ruleFields;
  const baseFields = {
    type: ruleType,
    ...(timeline.id != null &&
      timeline.title != null && {
        timeline_id: timeline.id,
        timeline_title: timeline.title,
      }),
  };

  const typeFields = isMlFields(ruleFields)
    ? {
        anomaly_threshold: ruleFields.anomalyThreshold,
        machine_learning_job_id: ruleFields.machineLearningJobId,
      }
    : isThresholdFields(ruleFields)
    ? {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id,
        ...(ruleType === 'threshold' && {
          threshold: {
            field: ruleFields.threshold?.field[0] ?? '',
            value: parseInt(ruleFields.threshold?.value, 10) ?? 0,
          },
        }),
      }
    : {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id,
        ...(ruleType === 'query' &&
          ruleFields.queryBar?.saved_id && { type: 'saved_query' as RuleType }),
      };

  return {
    ...baseFields,
    ...typeFields,
  };
};

export const formatScheduleStepData = (scheduleData: ScheduleStepRule): ScheduleStepRuleJson => {
  const { isNew, ...formatScheduleData } = scheduleData;
  if (!isEmpty(formatScheduleData.interval) && !isEmpty(formatScheduleData.from)) {
    const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(
      formatScheduleData.interval
    );
    const { unit: fromUnit, value: fromValue } = getTimeTypeValue(formatScheduleData.from);
    const duration = moment.duration(intervalValue, intervalUnit as 's' | 'm' | 'h');
    duration.add(fromValue, fromUnit as 's' | 'm' | 'h');
    formatScheduleData.from = `now-${duration.asSeconds()}s`;
    formatScheduleData.to = 'now';
  }
  return {
    ...formatScheduleData,
    meta: {
      from: scheduleData.from,
    },
  };
};

export const formatAboutStepData = (aboutStepData: AboutStepRule): AboutStepRuleJson => {
  const {
    author,
    falsePositives,
    references,
    riskScore,
    severity,
    threat,
    isAssociatedToEndpointList,
    isBuildingBlock,
    isNew,
    note,
    ruleNameOverride,
    timestampOverride,
    ...rest
  } = aboutStepData;
  const resp = {
    author: author.filter((item) => !isEmpty(item)),
    ...(isBuildingBlock ? { building_block_type: 'default' } : {}),
    ...(isAssociatedToEndpointList
      ? {
          exceptions_list: [
            { id: ENDPOINT_LIST_ID, namespace_type: 'agnostic', type: 'endpoint' },
          ] as AboutStepRuleJson['exceptions_list'],
        }
      : {}),
    false_positives: falsePositives.filter((item) => !isEmpty(item)),
    references: references.filter((item) => !isEmpty(item)),
    risk_score: riskScore.value,
    risk_score_mapping: riskScore.mapping,
    rule_name_override: ruleNameOverride !== '' ? ruleNameOverride : undefined,
    severity: severity.value,
    severity_mapping: severity.mapping,
    threat: threat
      .filter((singleThreat) => singleThreat.tactic.name !== 'none')
      .map((singleThreat) => ({
        ...singleThreat,
        framework: 'MITRE ATT&CK',
        technique: singleThreat.technique.map((technique) => {
          const { id, name, reference } = technique;
          return { id, name, reference };
        }),
      })),
    timestamp_override: timestampOverride !== '' ? timestampOverride : undefined,
    ...(!isEmpty(note) ? { note } : {}),
    ...rest,
  };
  return resp;
};

export const formatActionsStepData = (actionsStepData: ActionsStepRule): ActionsStepRuleJson => {
  const {
    actions = [],
    enabled,
    kibanaSiemAppUrl,
    throttle = NOTIFICATION_THROTTLE_NO_ACTIONS,
  } = actionsStepData;

  return {
    actions: actions.map(transformAlertToRuleAction),
    enabled,
    throttle: actions.length ? throttle : NOTIFICATION_THROTTLE_NO_ACTIONS,
    meta: {
      kibana_siem_app_url: kibanaSiemAppUrl,
    },
  };
};

export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule
): NewRule =>
  deepmerge.all([
    formatDefineStepData(defineStepData),
    formatAboutStepData(aboutStepData),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]) as NewRule;
