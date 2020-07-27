/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import memoizeOne from 'memoize-one';
import { useLocation } from 'react-router-dom';

import { RuleAlertAction, RuleType } from '../../../../../common/detection_engine/types';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { transformRuleToAlertAction } from '../../../../../common/detection_engine/transform_actions';
import { Filter } from '../../../../../../../../src/plugins/data/public';
import { ENDPOINT_LIST_ID } from '../../../../shared_imports';
import { Rule } from '../../../containers/detection_engine/rules';
import {
  AboutStepRule,
  AboutStepRuleDetails,
  DefineStepRule,
  IMitreEnterpriseAttack,
  ScheduleStepRule,
  ActionsStepRule,
} from './types';

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
  rule: Rule;
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
  rule: Omit<Rule, 'actions'> & { actions: RuleAlertAction[] }
): ActionsStepRule => {
  const { enabled, throttle, meta, actions = [] } = rule;

  return {
    actions: actions?.map(transformRuleToAlertAction),
    isNew: false,
    throttle,
    kibanaSiemAppUrl: meta?.kibana_siem_app_url,
    enabled,
  };
};

export const getDefineStepsData = (rule: Rule): DefineStepRule => ({
  isNew: false,
  ruleType: rule.type,
  anomalyThreshold: rule.anomaly_threshold ?? 50,
  machineLearningJobId: rule.machine_learning_job_id ?? '',
  index: rule.index ?? [],
  queryBar: {
    query: { query: rule.query ?? '', language: rule.language ?? '' },
    filters: (rule.filters ?? []) as Filter[],
    saved_id: rule.saved_id,
  },
  timeline: {
    id: rule.timeline_id ?? null,
    title: rule.timeline_title ?? null,
  },
  threshold: {
    field: rule.threshold?.field ? [rule.threshold.field] : [],
    value: `${rule.threshold?.value || 100}`,
  },
});

export const getScheduleStepsData = (rule: Rule): ScheduleStepRule => {
  const { interval, from } = rule;
  const fromHumanizedValue = getHumanizedDuration(from, interval);

  return {
    isNew: false,
    interval,
    from: fromHumanizedValue,
  };
};

export const getHumanizedDuration = (from: string, interval: string): string => {
  const fromValue = dateMath.parse(from) ?? moment();
  const intervalValue = dateMath.parse(`now-${interval}`) ?? moment();

  const fromDuration = moment.duration(intervalValue.diff(fromValue));
  const fromHumanize = `${Math.floor(fromDuration.asHours())}h`;

  if (fromDuration.asSeconds() < 60) {
    return `${Math.floor(fromDuration.asSeconds())}s`;
  } else if (fromDuration.asMinutes() < 60) {
    return `${Math.floor(fromDuration.asMinutes())}m`;
  }

  return fromHumanize;
};

export const getAboutStepsData = (rule: Rule, detailsView: boolean): AboutStepRule => {
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
    references,
    severity,
    false_positives: falsePositives,
    risk_score: riskScore,
    tags,
    threat,
  } = rule;

  return {
    isNew: false,
    author,
    isAssociatedToEndpointList: exceptionsList?.some(({ id }) => id === ENDPOINT_LIST_ID) ?? false,
    isBuildingBlock: buildingBlockType !== undefined,
    license: license ?? '',
    ruleNameOverride: ruleNameOverride ?? '',
    timestampOverride: timestampOverride ?? '',
    name,
    description,
    note: note!,
    references,
    severity: {
      value: severity,
      mapping: severityMapping,
    },
    tags,
    riskScore: {
      value: riskScore,
      mapping: riskScoreMapping,
    },
    falsePositives,
    threat: threat as IMitreEnterpriseAttack[],
  };
};

export const determineDetailsValue = (
  rule: Rule,
  detailsView: boolean
): Pick<Rule, 'name' | 'description' | 'note'> => {
  const { name, description, note } = rule;
  if (detailsView) {
    return { name: '', description: '', note: '' };
  }

  return { name, description, note: note ?? '' };
};

export const getModifiedAboutDetailsData = (rule: Rule): AboutStepRuleDetails => ({
  note: rule.note ?? '',
  description: rule.description,
});

export const useQuery = () => new URLSearchParams(useLocation().search);

export type PrePackagedRuleStatus =
  | 'ruleInstalled'
  | 'ruleNotInstalled'
  | 'ruleNeedUpdate'
  | 'someRuleUninstall'
  | 'unknown';

export type PrePackagedTimelineStatus =
  | 'timelinesNotInstalled'
  | 'timelinesInstalled'
  | 'someTimelineUninstall'
  | 'timelineNeedUpdate'
  | 'unknown';

export const getPrePackagedRuleStatus = (
  rulesInstalled: number | null,
  rulesNotInstalled: number | null,
  rulesNotUpdated: number | null
): PrePackagedRuleStatus => {
  if (
    rulesNotInstalled != null &&
    rulesInstalled === 0 &&
    rulesNotInstalled > 0 &&
    rulesNotUpdated === 0
  ) {
    return 'ruleNotInstalled';
  } else if (
    rulesInstalled != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled === 0 &&
    rulesNotUpdated === 0
  ) {
    return 'ruleInstalled';
  } else if (
    rulesInstalled != null &&
    rulesNotInstalled != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled > 0 &&
    rulesNotUpdated === 0
  ) {
    return 'someRuleUninstall';
  } else if (
    rulesInstalled != null &&
    rulesNotInstalled != null &&
    rulesNotUpdated != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled >= 0 &&
    rulesNotUpdated > 0
  ) {
    return 'ruleNeedUpdate';
  }
  return 'unknown';
};
export const getPrePackagedTimelineStatus = (
  timelinesInstalled: number | null,
  timelinesNotInstalled: number | null,
  timelinesNotUpdated: number | null
): PrePackagedTimelineStatus => {
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

const getRuleSpecificRuleParamKeys = (ruleType: RuleType) => {
  const queryRuleParams = ['index', 'filters', 'language', 'query', 'saved_id'];

  if (isMlRule(ruleType)) {
    return ['anomaly_threshold', 'machine_learning_job_id'];
  }

  if (ruleType === 'threshold') {
    return ['threshold', ...queryRuleParams];
  }

  return queryRuleParams;
};

export const getActionMessageRuleParams = (ruleType: RuleType): string[] => {
  const commonRuleParamsKeys = [
    'id',
    'name',
    'description',
    'false_positives',
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
    // 'lists',
  ];

  const ruleParamsKeys = [
    ...commonRuleParamsKeys,
    ...getRuleSpecificRuleParamKeys(ruleType),
  ].sort();

  return ruleParamsKeys;
};

export const getActionMessageParams = memoizeOne((ruleType: RuleType | undefined): string[] => {
  if (!ruleType) {
    return [];
  }
  const actionMessageRuleParams = getActionMessageRuleParams(ruleType);

  return [
    'state.signals_count',
    '{context.results_link}',
    ...actionMessageRuleParams.map((param) => `context.rule.${param}`),
  ];
});

// typed as null not undefined as the initial state for this value is null.
export const userHasNoPermissions = (canUserCRUD: boolean | null): boolean =>
  canUserCRUD != null ? !canUserCRUD : false;
