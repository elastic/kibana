/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import memoizeOne from 'memoize-one';
import { useLocation } from 'react-router-dom';

import styled from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import type {
  Severity,
  SeverityMapping,
  Threats,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { Filter } from '@kbn/es-query';
import type { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { requiredOptional } from '@kbn/zod-helpers';
import type { ResponseAction } from '../../../../../common/api/detection_engine/model/rule_response_actions';
import { normalizeThresholdField } from '../../../../../common/detection_engine/utils';
import { assertUnreachable } from '../../../../../common/utility_types';
import {
  transformRuleToAlertAction,
  transformRuleToAlertResponseAction,
} from '../../../../../common/detection_engine/transform_actions';
import type {
  AboutStepRule,
  AboutStepRuleDetails,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from './types';
import { DataSourceType, GroupByOptions } from './types';
import { severityOptions } from '../../../../detection_engine/rule_creation_ui/components/step_about_rule/data';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import type { RuleAction, RuleResponse } from '../../../../../common/api/detection_engine';

export interface GetStepsData {
  aboutRuleData: AboutStepRule;
  modifiedAboutRuleDetailsData: AboutStepRuleDetails;
  defineRuleData: DefineStepRule;
  scheduleRuleData: ScheduleStepRule;
  ruleActionsData: ActionsStepRule;
}

export const getStepsData = ({
  rule,
  detailsView = false,
}: {
  rule: RuleResponse;
  detailsView?: boolean;
}): GetStepsData => {
  const defineRuleData: DefineStepRule = getDefineStepsData(rule);
  const aboutRuleData: AboutStepRule = getAboutStepsData(rule, detailsView);
  const modifiedAboutRuleDetailsData: AboutStepRuleDetails = getModifiedAboutDetailsData(rule);
  const scheduleRuleData: ScheduleStepRule = getScheduleStepsData(rule);
  const ruleActionsData: ActionsStepRule = getActionsStepsData(rule);

  return {
    aboutRuleData,
    modifiedAboutRuleDetailsData,
    defineRuleData,
    scheduleRuleData,
    ruleActionsData,
  };
};

export const getActionsStepsData = (
  rule: Omit<RuleResponse, 'actions'> & {
    actions: RuleAction[];
    response_actions?: ResponseAction[];
  }
): ActionsStepRule => {
  const { enabled, meta, actions = [], response_actions: responseActions } = rule;

  return {
    actions: actions?.map((action) => transformRuleToAlertAction(action)),
    responseActions: responseActions?.map(transformRuleToAlertResponseAction),
    kibanaSiemAppUrl:
      typeof meta?.kibana_siem_app_url === 'string' ? meta.kibana_siem_app_url : undefined,
    enabled,
  };
};

export const getMachineLearningJobId = (rule: RuleResponse): string[] | undefined => {
  if (rule.type === 'machine_learning') {
    return typeof rule.machine_learning_job_id === 'string'
      ? [rule.machine_learning_job_id]
      : rule.machine_learning_job_id;
  }
  return undefined;
};

/* eslint-disable complexity */
export const getDefineStepsData = (rule: RuleResponse): DefineStepRule => ({
  ruleType: rule.type,
  anomalyThreshold: 'anomaly_threshold' in rule ? rule.anomaly_threshold : 50,
  machineLearningJobId: getMachineLearningJobId(rule) || [],
  index: ('index' in rule && rule.index) || [],
  dataViewId: 'data_view_id' in rule ? rule.data_view_id : undefined,
  threatIndex: ('threat_index' in rule && rule.threat_index) || [],
  threatQueryBar: {
    query: {
      query: ('threat_query' in rule && rule.threat_query) || '',
      language: ('threat_language' in rule && rule.threat_language) || '',
    },
    filters: (('threat_filters' in rule && rule.threat_filters) || []) as Filter[],
    saved_id: null,
  },
  threatMapping: ('threat_mapping' in rule && rule.threat_mapping) || [],
  queryBar: {
    query: {
      query: ('query' in rule && rule.query) || '',
      language: ('language' in rule && rule.language) || '',
    },
    filters: (('filters' in rule && rule.filters) || []) as Filter[],
    saved_id: ('saved_id' in rule && rule.saved_id) || null,
  },
  relatedIntegrations: rule.related_integrations ?? [],
  requiredFields: rule.required_fields ?? [],
  timeline: {
    id: rule.timeline_id ?? null,
    title: rule.timeline_title ?? null,
  },
  threshold: {
    field: normalizeThresholdField('threshold' in rule ? rule.threshold?.field : undefined),
    value: `${('threshold' in rule && rule.threshold?.value) || 100}`,
    ...('threshold' in rule && rule.threshold?.cardinality?.length
      ? {
          cardinality: {
            field: [`${rule.threshold.cardinality[0].field}`],
            value: `${rule.threshold.cardinality[0].value}`,
          },
        }
      : {}),
  },
  eqlOptions: {
    timestampField: 'timestamp_field' in rule ? rule.timestamp_field : undefined,
    eventCategoryField:
      'event_category_override' in rule ? rule.event_category_override : undefined,
    tiebreakerField: 'tiebreaker_field' in rule ? rule.tiebreaker_field : undefined,
  },
  dataSourceType:
    'data_view_id' in rule && rule.data_view_id
      ? DataSourceType.DataView
      : DataSourceType.IndexPatterns,
  newTermsFields: ('new_terms_fields' in rule && rule.new_terms_fields) || [],
  historyWindowSize:
    'history_window_start' in rule && rule.history_window_start
      ? convertHistoryStartToSize(rule.history_window_start)
      : '7d',
  shouldLoadQueryDynamically: Boolean(rule.type === 'saved_query' && rule.saved_id),
  groupByFields:
    ('alert_suppression' in rule &&
      rule.alert_suppression &&
      'group_by' in rule.alert_suppression &&
      rule.alert_suppression.group_by) ||
    [],
  groupByRadioSelection:
    'alert_suppression' in rule && rule.alert_suppression?.duration
      ? GroupByOptions.PerTimePeriod
      : GroupByOptions.PerRuleExecution,
  groupByDuration: ('alert_suppression' in rule && rule.alert_suppression?.duration) || {
    value: 5,
    unit: 'm',
  },
  suppressionMissingFields:
    ('alert_suppression' in rule &&
      rule.alert_suppression &&
      'missing_fields_strategy' in rule.alert_suppression &&
      rule.alert_suppression.missing_fields_strategy) ||
    DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  enableThresholdSuppression: Boolean(
    'alert_suppression' in rule && rule.alert_suppression?.duration
  ),
});

export const convertHistoryStartToSize = (relativeTime: string) => {
  if (relativeTime.startsWith('now-')) {
    return relativeTime.substring(4);
  } else {
    return relativeTime;
  }
};

export const getScheduleStepsData = (rule: RuleResponse): ScheduleStepRule => {
  const { interval, from } = rule;
  const fromHumanizedValue = getHumanizedDuration(from, interval);

  return {
    interval,
    from: fromHumanizedValue,
  };
};

export const getHumanizedDuration = (from: string, interval: string): string => {
  const fromValue = dateMath.parse(from) ?? moment();
  const intervalValue = dateMath.parse(`now-${interval}`) ?? moment();

  const fromDuration = moment.duration(intervalValue.diff(fromValue));

  // Basing calculations off floored seconds count as moment durations weren't precise
  const intervalDuration = Math.floor(fromDuration.asSeconds());
  // For consistency of display value
  if (intervalDuration === 0) {
    return `0s`;
  }

  if (intervalDuration % 3600 === 0) {
    return `${intervalDuration / 3600}h`;
  } else if (intervalDuration % 60 === 0) {
    return `${intervalDuration / 60}m`;
  } else {
    return `${intervalDuration}s`;
  }
};

export const getAboutStepsData = (rule: RuleResponse, detailsView: boolean): AboutStepRule => {
  const { name, description, note } = determineDetailsValue(rule, detailsView);
  const {
    author,
    building_block_type: buildingBlockType,
    exceptions_list: exceptionsList,
    license,
    risk_score_mapping: riskScoreMapping,
    rule_name_override: ruleNameOverride,
    severity_mapping: severityMapping,
    timestamp_override: timestampOverride,
    timestamp_override_fallback_disabled: timestampOverrideFallbackDisabled,
    references,
    severity,
    false_positives: falsePositives,
    risk_score: riskScore,
    investigation_fields: investigationFields,
    tags,
    threat,
  } = rule;
  const threatIndicatorPath =
    'threat_indicator_path' in rule ? rule.threat_indicator_path : undefined;

  return {
    author,
    isAssociatedToEndpointList: exceptionsList?.some(({ id }) => id === ENDPOINT_LIST_ID) ?? false,
    isBuildingBlock: buildingBlockType !== undefined,
    license: license ?? '',
    ruleNameOverride: ruleNameOverride ?? '',
    timestampOverride: timestampOverride ?? '',
    timestampOverrideFallbackDisabled,
    name,
    description,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    note: note!,
    references,
    severity: {
      value: severity as Severity,
      mapping: fillEmptySeverityMappings(severityMapping),
      isMappingChecked: severityMapping.length > 0,
    },
    tags,
    riskScore: {
      value: riskScore,
      mapping: requiredOptional(riskScoreMapping),
      isMappingChecked: riskScoreMapping.length > 0,
    },
    falsePositives,
    investigationFields: investigationFields?.field_names ?? [],
    threat: threat as Threats,
    threatIndicatorPath,
  };
};

const severitySortMapping = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const fillEmptySeverityMappings = (mappings: SeverityMapping): SeverityMapping => {
  const missingMappings: SeverityMapping = severityOptions.flatMap((so) =>
    mappings.find((mapping) => mapping.severity === so.value) == null
      ? [{ field: '', value: '', operator: 'equals', severity: so.value }]
      : []
  );
  return [...mappings, ...missingMappings].sort(
    (a, b) => severitySortMapping[a.severity] - severitySortMapping[b.severity]
  );
};

export const determineDetailsValue = (
  rule: RuleResponse,
  detailsView: boolean
): Pick<RuleResponse, 'name' | 'description' | 'note'> => {
  const { name, description, note } = rule;
  if (detailsView) {
    return { name: '', description: '', note: '' };
  }

  return { name, description, note: note ?? '' };
};

export const getModifiedAboutDetailsData = (rule: RuleResponse): AboutStepRuleDetails => ({
  note: rule.note ?? '',
  description: rule.description,
  setup: rule.setup ?? '',
});

export const useQuery = () => new URLSearchParams(useLocation().search);

export type PrePackagedRuleInstallationStatus =
  | 'ruleInstalled'
  | 'ruleNotInstalled'
  | 'ruleNeedUpdate'
  | 'someRuleUninstall'
  | 'unknown';

export type PrePackagedTimelineInstallationStatus =
  | 'timelinesNotInstalled'
  | 'timelinesInstalled'
  | 'someTimelineUninstall'
  | 'timelineNeedUpdate'
  | 'unknown';

export const getPrePackagedTimelineInstallationStatus = (
  timelinesInstalled?: number,
  timelinesNotInstalled?: number,
  timelinesNotUpdated?: number
): PrePackagedTimelineInstallationStatus => {
  if (
    timelinesNotInstalled != null &&
    timelinesInstalled === 0 &&
    timelinesNotInstalled > 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'timelinesNotInstalled';
  } else if (
    timelinesInstalled != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled === 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'timelinesInstalled';
  } else if (
    timelinesInstalled != null &&
    timelinesNotInstalled != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled > 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'someTimelineUninstall';
  } else if (
    timelinesInstalled != null &&
    timelinesNotInstalled != null &&
    timelinesNotUpdated != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled >= 0 &&
    timelinesNotUpdated > 0
  ) {
    return 'timelineNeedUpdate';
  }
  return 'unknown';
};

export const redirectToDetections = (
  isSignalIndexExists: boolean | null,
  isAuthenticated: boolean | null,
  hasEncryptionKey: boolean | null,
  needsListsConfiguration: boolean
) =>
  isSignalIndexExists === false ||
  isAuthenticated === false ||
  hasEncryptionKey === false ||
  needsListsConfiguration;

const commonRuleParamsKeys = [
  'id',
  'name',
  'description',
  'false_positives',
  'investigation_fields',
  'rule_id',
  'max_signals',
  'risk_score',
  'output_index',
  'references',
  'severity',
  'timeline_id',
  'timeline_title',
  'threat',
  'type',
  'version',
];
const queryRuleParams = ['index', 'filters', 'language', 'query', 'saved_id', 'response_actions'];
const esqlRuleParams = ['filters', 'language', 'query', 'response_actions'];
const machineLearningRuleParams = ['anomaly_threshold', 'machine_learning_job_id'];
const thresholdRuleParams = ['threshold', ...queryRuleParams];

const getAllRuleParamsKeys = (): string[] => {
  const allRuleParamsKeys = [
    ...commonRuleParamsKeys,
    ...queryRuleParams,
    ...machineLearningRuleParams,
    ...thresholdRuleParams,
  ].sort();

  return Array.from(new Set<string>(allRuleParamsKeys));
};

const getRuleSpecificRuleParamKeys = (ruleType: Type) => {
  switch (ruleType) {
    case 'machine_learning':
      return machineLearningRuleParams;
    case 'threshold':
      return thresholdRuleParams;
    case 'esql':
      return esqlRuleParams;
    case 'new_terms':
    case 'threat_match':
    case 'query':
    case 'saved_query':
    case 'eql':
      return queryRuleParams;
  }
  assertUnreachable(ruleType);
};

export const getActionMessageRuleParams = (ruleType: Type): string[] => {
  const ruleParamsKeys = [
    ...commonRuleParamsKeys,
    ...getRuleSpecificRuleParamKeys(ruleType),
  ].sort();

  return ruleParamsKeys;
};

const transformRuleKeysToActionVariables = (actionMessageRuleParams: string[]): ActionVariables => {
  return {
    state: [{ name: 'signals_count', description: 'state.signals_count' }],
    params: [],
    context: [
      {
        name: 'results_link',
        description: 'context.results_link',
        useWithTripleBracesInTemplates: true,
      },
      { name: 'alerts', description: 'context.alerts' },
      ...actionMessageRuleParams.map((param) => {
        const extendedParam = `rule.${param}`;
        return { name: extendedParam, description: `context.${extendedParam}` };
      }),
    ],
  };
};

export const getActionMessageParams = memoizeOne((ruleType: Type | undefined): ActionVariables => {
  if (!ruleType) {
    return { state: [], params: [] };
  }
  const actionMessageRuleParams = getActionMessageRuleParams(ruleType);

  return transformRuleKeysToActionVariables(actionMessageRuleParams);
});

/**
 * returns action variables available for all rule types
 */
export const getAllActionMessageParams = () =>
  transformRuleKeysToActionVariables(getAllRuleParamsKeys());

export const MaxWidthEuiFlexItem = styled(EuiFlexItem)`
  max-width: 1000px;
  overflow: hidden;
`;
