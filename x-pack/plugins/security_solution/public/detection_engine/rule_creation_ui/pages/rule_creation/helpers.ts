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
import omit from 'lodash/omit';

import type {
  ExceptionListType,
  NamespaceType,
  List,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  Threats,
  ThreatSubtechnique,
  ThreatTechnique,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../common/constants';
import { assertUnreachable } from '../../../../../common/utility_types';
import {
  transformAlertToRuleAction,
  transformAlertToRuleResponseAction,
} from '../../../../../common/detection_engine/transform_actions';

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
} from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import type { RuleCreateProps } from '../../../../../common/detection_engine/rule_schema';
import { stepActionsDefaultValue } from '../../../../detections/components/rules/step_rule_actions';

export const getTimeTypeValue = (time: string): { unit: Unit; value: number } => {
  const timeObj: { unit: Unit; value: number } = {
    unit: 'ms',
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
    timeObj.unit = filterTimeType[0] as Unit;
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
  newTermsFields?: unknown;
  historyWindowSize?: unknown;
}

const filterRuleFieldsWrappedWithType = <T extends Partial<RuleFields>>(fields: T, type: Type) => {
  switch (type) {
    case 'machine_learning':
      return {
        fields: omit(fields, [
          'index',
          'queryBar',
          'threshold',
          'threatIndex',
          'threatQueryBar',
          'threatMapping',
          'eqlOptions',
          'newTermsFields',
          'historyWindowSize',
        ]),
        type,
      };
    case 'threshold':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'machineLearningJobId',
          'threatIndex',
          'threatQueryBar',
          'threatMapping',
          'eqlOptions',
          'newTermsFields',
          'historyWindowSize',
        ]),
        type,
      };
    case 'threat_match':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'machineLearningJobId',
          'threshold',
          'eqlOptions',
          'newTermsFields',
          'historyWindowSize',
        ]),
        type,
      };
    case 'query':
    case 'saved_query':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'machineLearningJobId',
          'threshold',
          'threatIndex',
          'threatQueryBar',
          'threatMapping',
          'eqlOptions',
          'newTermsFields',
          'historyWindowSize',
        ]),
        type,
      };
    case 'eql':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'machineLearningJobId',
          'threshold',
          'threatIndex',
          'threatQueryBar',
          'threatMapping',
          'newTermsFields',
          'historyWindowSize',
        ]),
        type,
      };
    case 'new_terms':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'machineLearningJobId',
          'threshold',
          'threatIndex',
          'threatQueryBar',
          'threatMapping',
          'eqlOptions',
        ]),
        type,
      };
    case 'data_quality':
      return {
        fields: omit(fields, [
          'anomalyThreshold',
          'queryBar',
          'threshold',
          'threatQueryBar',
          'threatMapping',
          'eqlOptions',
          'newTermsFields',
          'historyWindowSize',
          'machineLearningJobId',
        ]),
        type,
      };
  }
  assertUnreachable(type);
};

export const filterRuleFieldsForType = <T extends Partial<RuleFields>>(fields: T, type: Type) =>
  filterRuleFieldsWrappedWithType(fields, type).fields;

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

/**
 * remove unused data source.
 * Ex: rule is using a data view so we should not
 * write an index property on the rule form.
 * @param defineStepData
 * @returns DefineStepRule
 */
export const getStepDataDataSource = (
  defineStepData: DefineStepRule
): Omit<DefineStepRule, 'dataViewId' | 'index' | 'dataSourceType'> & {
  index?: string[];
  dataViewId?: string;
} => {
  const copiedStepData = { ...defineStepData };
  if (defineStepData.dataSourceType === DataSourceType.DataView) {
    return omit(copiedStepData, ['index', 'dataSourceType']);
  } else if (defineStepData.dataSourceType === DataSourceType.IndexPatterns) {
    return omit(copiedStepData, ['dataViewId', 'dataSourceType']);
  }
  return copiedStepData;
};

export const formatDefineStepData = (defineStepData: DefineStepRule): DefineStepRuleJson => {
  const stepData = getStepDataDataSource(defineStepData);

  const { timeline } = stepData;

  const { fields: ruleFields, type: ruleType } = filterRuleFieldsWrappedWithType(
    stepData,
    stepData.ruleType
  );

  const baseFields = {
    type: ruleType,
    ...(timeline.id != null &&
      timeline.title != null && {
        timeline_id: timeline.id,
        timeline_title: timeline.title,
      }),
  };

  const typeFields = (() => {
    switch (ruleType) {
      case 'machine_learning': {
        return {
          anomaly_threshold: ruleFields.anomalyThreshold,
          machine_learning_job_id: ruleFields.machineLearningJobId,
        };
      }

      case 'eql': {
        return {
          index: ruleFields.index,
          filters: ruleFields.queryBar?.filters,
          language: ruleFields.queryBar?.query?.language,
          query: ruleFields.queryBar?.query?.query as string,
          saved_id: ruleFields.queryBar?.saved_id ?? undefined,
          timestamp_field: ruleFields.eqlOptions?.timestampField,
          event_category_override: ruleFields.eqlOptions?.eventCategoryField,
          tiebreaker_field: ruleFields.eqlOptions?.tiebreakerField,
        };
      }

      case 'threshold': {
        return {
          index: ruleFields.index,
          filters: ruleFields.queryBar?.filters,
          language: ruleFields.queryBar?.query?.language,
          query: ruleFields.queryBar?.query?.query as string,
          saved_id: ruleFields.queryBar?.saved_id ?? undefined,
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
        };
      }

      case 'threat_match': {
        return {
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
        };
      }

      case 'new_terms': {
        return {
          index: ruleFields.index,
          filters: ruleFields.queryBar?.filters,
          language: ruleFields.queryBar?.query?.language,
          query: ruleFields.queryBar?.query?.query as string,
          new_terms_fields: ruleFields.newTermsFields,
          history_window_start: `now-${ruleFields.historyWindowSize}`,
        };
      }

      case 'data_quality': {
        return {
          index: ruleFields.index,
          threat_index: ruleFields.threatIndex,
        };
      }

      default: {
        return {
          ...(ruleFields.groupByFields.length > 0
            ? { alert_suppression: { group_by: ruleFields.groupByFields } }
            : {}),
          index: ruleFields.index,
          filters: ruleFields.queryBar?.filters,
          language: ruleFields.queryBar?.query?.language,
          query: ruleFields.queryBar?.query?.query as string,
          saved_id: undefined,
          type: 'query' as Type,
          // rule only be updated as saved_query type if it has saved_id and shouldLoadQueryDynamically checkbox checked
          ...(['query', 'saved_query'].includes(ruleType) &&
            ruleFields.queryBar?.saved_id &&
            ruleFields.shouldLoadQueryDynamically && {
              type: 'saved_query' as Type,
              query: undefined,
              filters: undefined,
              saved_id: ruleFields.queryBar.saved_id,
            }),
        };
      }
    }
  })();

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
    const duration = moment.duration(intervalValue, intervalUnit);
    duration.add(fromValue, fromUnit);
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
    timestampOverrideFallbackDisabled,
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
    timestamp_override_fallback_disabled: timestampOverrideFallbackDisabled,
    ...(!isEmpty(note) ? { note } : {}),
    ...rest,
  };
  return resp;
};

export const formatActionsStepData = (actionsStepData: ActionsStepRule): ActionsStepRuleJson => {
  const {
    actions = [],
    responseActions,
    enabled,
    kibanaSiemAppUrl,
    throttle = NOTIFICATION_THROTTLE_NO_ACTIONS,
  } = actionsStepData;

  return {
    actions: actions.map(transformAlertToRuleAction),
    response_actions: responseActions?.map(transformAlertToRuleResponseAction),
    enabled,
    throttle: actions.length ? throttle : NOTIFICATION_THROTTLE_NO_ACTIONS,
    meta: {
      kibana_siem_app_url: kibanaSiemAppUrl,
    },
  };
};

// Used to format form data in rule edit and
// create flows so "T" here would likely
// either be RuleCreateProps or Rule
export const formatRule = <T>(
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule,
  exceptionsList?: List[]
): T =>
  deepmerge.all([
    formatDefineStepData(defineStepData),
    formatAboutStepData(aboutStepData, exceptionsList),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]) as unknown as T;

export const formatPreviewRule = ({
  defineRuleData,
  aboutRuleData,
  scheduleRuleData,
  exceptionsList,
}: {
  defineRuleData: DefineStepRule;
  aboutRuleData: AboutStepRule;
  scheduleRuleData: ScheduleStepRule;
  exceptionsList?: List[];
}): RuleCreateProps => {
  const aboutStepData = {
    ...aboutRuleData,
    name: 'Preview Rule',
    description: 'Preview Rule',
  };
  return {
    ...formatRule<RuleCreateProps>(
      defineRuleData,
      aboutStepData,
      scheduleRuleData,
      stepActionsDefaultValue,
      exceptionsList
    ),
  };
};
