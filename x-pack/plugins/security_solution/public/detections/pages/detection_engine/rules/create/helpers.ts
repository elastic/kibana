/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, isEmpty } from 'lodash/fp';
import type { Unit } from '@kbn/datemath';
import moment from 'moment';
import deepmerge from 'deepmerge';

import type {
  ExceptionListType,
  NamespaceType,
  List,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  ThreatMapping,
  Threats,
  ThreatSubtechnique,
  ThreatTechnique,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../common/constants';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type { Rule } from '../../../../containers/detection_engine/rules';
import type {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  ActionsStepRuleJson,
  RuleStepsFormData,
  RuleStep,
} from '../types';
import type { FieldValueQueryBar } from '../../../../components/rules/query_bar';
import type { CreateRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { stepDefineDefaultValue } from '../../../../components/rules/step_define_rule';
import { stepAboutDefaultValue } from '../../../../components/rules/step_about_rule/default_value';
import { stepActionsDefaultValue } from '../../../../components/rules/step_rule_actions';
import type { FieldValueThreshold } from '../../../../components/rules/threshold_input';
import type { EqlOptionsSelected } from '../../../../../../common/search_strategy';

export const getTimeTypeValue = (time: string): { unit: string; value: number } => {
  const timeObj = {
    unit: '',
    value: 0,
  };
  const filterTimeVal = time.match(/\d+/g);
  const filterTimeType = time.match(/[a-zA-Z]+/g);
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

export const stepIsValid = <T extends RuleStepsFormData[keyof RuleStepsFormData]>(
  formData?: T
): formData is { [K in keyof T]: Exclude<T[K], undefined> } =>
  !!formData?.isValid && !!formData.data;

export const isDefineStep = (input: unknown): input is RuleStepsFormData[RuleStep.defineRule] =>
  has('data.ruleType', input);

export const isAboutStep = (input: unknown): input is RuleStepsFormData[RuleStep.aboutRule] =>
  has('data.name', input);

export const isScheduleStep = (input: unknown): input is RuleStepsFormData[RuleStep.scheduleRule] =>
  has('data.interval', input);

export const isActionsStep = (input: unknown): input is RuleStepsFormData[RuleStep.ruleActions] =>
  has('data.actions', input);

export interface RuleFields {
  anomalyThreshold: unknown;
  machineLearningJobId: unknown;
  queryBar: unknown;
  index: unknown;
  dataViewId?: unknown;
  ruleType: unknown;
  threshold?: unknown;
  threatIndex?: unknown;
  threatQueryBar?: unknown;
  threatMapping?: unknown;
  threatLanguage?: unknown;
  eqlOptions: unknown;
}

type QueryRuleFields<T> = Omit<
  T,
  | 'anomalyThreshold'
  | 'machineLearningJobId'
  | 'threshold'
  | 'threatIndex'
  | 'threatQueryBar'
  | 'threatMapping'
  | 'eqlOptions'
>;
type EqlQueryRuleFields<T> = Omit<
  T,
  | 'anomalyThreshold'
  | 'machineLearningJobId'
  | 'threshold'
  | 'threatIndex'
  | 'threatQueryBar'
  | 'threatMapping'
>;
type ThresholdRuleFields<T> = Omit<
  T,
  | 'anomalyThreshold'
  | 'machineLearningJobId'
  | 'threatIndex'
  | 'threatQueryBar'
  | 'threatMapping'
  | 'eqlOptions'
>;
type MlRuleFields<T> = Omit<
  T,
  | 'queryBar'
  | 'index'
  | 'threshold'
  | 'threatIndex'
  | 'threatQueryBar'
  | 'threatMapping'
  | 'eqlOptions'
>;
type ThreatMatchRuleFields<T> = Omit<
  T,
  'anomalyThreshold' | 'machineLearningJobId' | 'threshold' | 'eqlOptions'
>;

const isMlFields = <T>(
  fields:
    | QueryRuleFields<T>
    | EqlQueryRuleFields<T>
    | MlRuleFields<T>
    | ThresholdRuleFields<T>
    | ThreatMatchRuleFields<T>
): fields is MlRuleFields<T> => has('anomalyThreshold', fields);

const isThresholdFields = <T>(
  fields:
    | QueryRuleFields<T>
    | EqlQueryRuleFields<T>
    | MlRuleFields<T>
    | ThresholdRuleFields<T>
    | ThreatMatchRuleFields<T>
): fields is ThresholdRuleFields<T> => has('threshold', fields);

const isThreatMatchFields = <T>(
  fields:
    | QueryRuleFields<T>
    | EqlQueryRuleFields<T>
    | MlRuleFields<T>
    | ThresholdRuleFields<T>
    | ThreatMatchRuleFields<T>
): fields is ThreatMatchRuleFields<T> => has('threatIndex', fields);

const isEqlFields = <T>(
  fields:
    | QueryRuleFields<T>
    | EqlQueryRuleFields<T>
    | MlRuleFields<T>
    | ThresholdRuleFields<T>
    | ThreatMatchRuleFields<T>
): fields is EqlQueryRuleFields<T> => has('eqlOptions', fields);

export const filterRuleFieldsForType = <T extends Partial<RuleFields>>(
  fields: T,
  type: Type
):
  | QueryRuleFields<T>
  | EqlQueryRuleFields<T>
  | MlRuleFields<T>
  | ThresholdRuleFields<T>
  | ThreatMatchRuleFields<T> => {
  switch (type) {
    case 'machine_learning':
      const {
        index,
        queryBar,
        threshold,
        threatIndex,
        threatQueryBar,
        threatMapping,
        eqlOptions,
        ...mlRuleFields
      } = fields;
      return mlRuleFields;
    case 'threshold':
      const {
        anomalyThreshold,
        machineLearningJobId,
        threatIndex: _removedThreatIndex,
        threatQueryBar: _removedThreatQueryBar,
        threatMapping: _removedThreatMapping,
        eqlOptions: _eqlOptions,
        ...thresholdRuleFields
      } = fields;
      return thresholdRuleFields;
    case 'threat_match':
      const {
        anomalyThreshold: _removedAnomalyThreshold,
        machineLearningJobId: _removedMachineLearningJobId,
        threshold: _removedThreshold,
        eqlOptions: __eqlOptions,
        ...threatMatchRuleFields
      } = fields;
      return threatMatchRuleFields;
    case 'query':
    case 'saved_query':
      const {
        anomalyThreshold: _a,
        machineLearningJobId: _m,
        threshold: _t,
        threatIndex: __removedThreatIndex,
        threatQueryBar: __removedThreatQueryBar,
        threatMapping: __removedThreatMapping,
        eqlOptions: ___eqlOptions,
        ...queryRuleFields
      } = fields;
      return queryRuleFields;
    case 'eql':
      const {
        anomalyThreshold: __a,
        machineLearningJobId: __m,
        threshold: __t,
        threatIndex: ___removedThreatIndex,
        threatQueryBar: ___removedThreatQueryBar,
        threatMapping: ___removedThreatMapping,
        ...eqlRuleFields
      } = fields;
      return eqlRuleFields;
  }
  assertUnreachable(type);
};

function trimThreatsWithNoName<T extends ThreatSubtechnique | ThreatTechnique>(
  filterable: T[]
): T[] {
  return filterable.filter((item) => item.name !== 'none');
}

/**
 * Filter out unfilled/empty threat, technique, and subtechnique fields based on if their name is `none`
 */
export const filterEmptyThreats = (threats: Threats): Threats => {
  return threats
    .filter((singleThreat) => singleThreat.tactic.name !== 'none')
    .map((threat) => {
      return {
        ...threat,
        technique: trimThreatsWithNoName(threat.technique ?? []).map((technique) => {
          return {
            ...technique,
            subtechnique:
              technique.subtechnique != null ? trimThreatsWithNoName(technique.subtechnique) : [],
          };
        }),
      };
    });
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
        saved_id: ruleFields.queryBar?.saved_id ?? undefined,
        ...(ruleType === 'threshold' && {
          threshold: {
            field: ruleFields.threshold?.field ?? [],
            value: parseInt(ruleFields.threshold?.value, 10) ?? 0,
            cardinality:
              !isEmpty(ruleFields.threshold.cardinality?.field) &&
              ruleFields.threshold.cardinality?.value != null
                ? [
                    {
                      field: ruleFields.threshold.cardinality.field[0],
                      value: parseInt(ruleFields.threshold.cardinality.value, 10),
                    },
                  ]
                : [],
          },
        }),
      }
    : isThreatMatchFields(ruleFields)
    ? {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id ?? undefined,
        threat_index: ruleFields.threatIndex,
        threat_query: ruleFields.threatQueryBar?.query?.query as string,
        threat_filters: ruleFields.threatQueryBar?.filters,
        threat_mapping: ruleFields.threatMapping,
        threat_language: ruleFields.threatQueryBar?.query?.language,
      }
    : isEqlFields(ruleFields)
    ? {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id ?? undefined,
        timestamp_field: ruleFields.eqlOptions?.timestampField,
        event_category_override: ruleFields.eqlOptions?.eventCategoryField,
        tiebreaker_field: ruleFields.eqlOptions?.tiebreakerField,
      }
    : {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id ?? undefined,
        ...(ruleType === 'query' &&
          ruleFields.queryBar?.saved_id && { type: 'saved_query' as Type }),
      };
  return {
    ...baseFields,
    ...typeFields,
    data_view_id: ruleFields.dataViewId,
  };
};

export const formatScheduleStepData = (scheduleData: ScheduleStepRule): ScheduleStepRuleJson => {
  const { ...formatScheduleData } = scheduleData;
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

export const formatAboutStepData = (
  aboutStepData: AboutStepRule,
  exceptionsList?: List[]
): AboutStepRuleJson => {
  const {
    author,
    falsePositives,
    references,
    riskScore,
    severity,
    threat,
    isAssociatedToEndpointList,
    isBuildingBlock,
    note,
    ruleNameOverride,
    threatIndicatorPath,
    timestampOverride,
    disableTimestampFallback,
    ...rest
  } = aboutStepData;

  const detectionExceptionLists =
    exceptionsList != null ? exceptionsList.filter((list) => list.type !== 'endpoint') : [];

  const resp = {
    author: author.filter((item) => !isEmpty(item)),
    ...(isBuildingBlock ? { building_block_type: 'default' } : {}),
    ...(isAssociatedToEndpointList
      ? {
          exceptions_list: [
            {
              id: ENDPOINT_LIST_ID,
              list_id: ENDPOINT_LIST_ID,
              namespace_type: 'agnostic' as NamespaceType,
              type: 'endpoint' as ExceptionListType,
            },
            ...detectionExceptionLists,
          ],
        }
      : exceptionsList != null
      ? {
          exceptions_list: [...detectionExceptionLists],
        }
      : {}),
    false_positives: falsePositives.filter((item) => !isEmpty(item)),
    references: references.filter((item) => !isEmpty(item)),
    risk_score: riskScore.value,
    risk_score_mapping: riskScore.isMappingChecked
      ? riskScore.mapping.filter((m) => m.field != null && m.field !== '')
      : [],
    rule_name_override: ruleNameOverride !== '' ? ruleNameOverride : undefined,
    severity: severity.value,
    severity_mapping: severity.isMappingChecked
      ? severity.mapping.filter((m) => m.field != null && m.field !== '' && m.value != null)
      : [],
    threat: filterEmptyThreats(threat).map((singleThreat) => ({
      ...singleThreat,
      framework: 'MITRE ATT&CK',
    })),
    threat_indicator_path: threatIndicatorPath,
    timestamp_override: timestampOverride !== '' ? timestampOverride : undefined,
    disable_timestamp_fallback: disableTimestampFallback,
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

// Used to format form data in rule edit and
// create flows so "T" here would likely
// either be CreateRulesSchema or Rule
export const formatRule = <T>(
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule,
  rule?: Rule | null
): T =>
  deepmerge.all([
    formatDefineStepData(defineStepData),
    formatAboutStepData(aboutStepData, rule?.exceptions_list),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]) as unknown as T;

export const formatPreviewRule = ({
  index,
  dataViewId,
  query,
  threatIndex,
  threatQuery,
  ruleType,
  threatMapping,
  timeFrame,
  threshold,
  machineLearningJobId,
  anomalyThreshold,
  eqlOptions,
}: {
  index: string[];
  dataViewId?: string;
  threatIndex: string[];
  query: FieldValueQueryBar;
  threatQuery: FieldValueQueryBar;
  ruleType: Type;
  threatMapping: ThreatMapping;
  timeFrame: Unit;
  threshold: FieldValueThreshold;
  machineLearningJobId: string[];
  anomalyThreshold: number;
  eqlOptions: EqlOptionsSelected;
}): CreateRulesSchema => {
  const defineStepData = {
    ...stepDefineDefaultValue,
    index,
    dataViewId,
    queryBar: query,
    ruleType,
    threatIndex,
    threatQueryBar: threatQuery,
    threatMapping,
    threshold,
    machineLearningJobId,
    anomalyThreshold,
    eqlOptions,
  };
  const aboutStepData = {
    ...stepAboutDefaultValue,
    name: 'Preview Rule',
    description: 'Preview Rule',
  };
  const scheduleStepData = {
    from: `now-${timeFrame === 'M' ? '25h' : timeFrame === 'd' ? '65m' : '6m'}`,
    interval: `${timeFrame === 'M' ? '1d' : timeFrame === 'd' ? '1h' : '5m'}`,
  };
  return {
    ...formatRule<CreateRulesSchema>(
      defineStepData,
      aboutStepData,
      scheduleStepData,
      stepActionsDefaultValue
    ),
    ...scheduleStepData,
  };
};
