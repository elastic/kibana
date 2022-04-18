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
import {
  Threats,
  Type,
  SeverityMapping,
  Severity,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { Filter } from '@kbn/es-query';
import { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { normalizeThresholdField } from '../../../../../common/detection_engine/utils';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { assertUnreachable } from '../../../../../common/utility_types';
import { transformRuleToAlertAction } from '../../../../../common/detection_engine/transform_actions';
import { Rule } from '../../../containers/detection_engine/rules';
import {
  AboutStepRule,
  AboutStepRuleDetails,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from './types';
import { severityOptions } from '../../../components/rules/step_about_rule/data';

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
    throttle,
    kibanaSiemAppUrl: meta?.kibana_siem_app_url,
    enabled,
  };
};

export const getDefineStepsData = (rule: Rule): DefineStepRule => ({
  ruleType: rule.type,
  anomalyThreshold: rule.anomaly_threshold ?? 50,
  machineLearningJobId: rule.machine_learning_job_id ?? [],
  index: rule.index ?? [],
  threatIndex: rule.threat_index ?? [],
  threatQueryBar: {
    query: { query: rule.threat_query ?? '', language: rule.threat_language ?? '' },
    filters: (rule.threat_filters ?? []) as Filter[],
    saved_id: undefined,
  },
  threatMapping: rule.threat_mapping ?? [],
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
    field: normalizeThresholdField(rule.threshold?.field),
    value: `${rule.threshold?.value || 100}`,
    ...(rule.threshold?.cardinality?.length
      ? {
          cardinality: {
            field: [`${rule.threshold.cardinality[0].field}`],
            value: `${rule.threshold.cardinality[0].value}`,
          },
        }
      : {}),
  },
});

export const getScheduleStepsData = (rule: Rule): ScheduleStepRule => {
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
    threat_indicator_path: threatIndicatorPath,
  } = rule;

  return {
    author,
    isAssociatedToEndpointList: exceptionsList?.some(({ id }) => id === ENDPOINT_LIST_ID) ?? false,
    isBuildingBlock: buildingBlockType !== undefined,
    license: license ?? '',
    ruleNameOverride: ruleNameOverride ?? '',
    timestampOverride: timestampOverride ?? '',
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
      mapping: riskScoreMapping,
      isMappingChecked: riskScoreMapping.length > 0,
    },
    falsePositives,
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

const getRuleSpecificRuleParamKeys = (ruleType: Type) => {
  const queryRuleParams = ['index', 'filters', 'language', 'query', 'saved_id'];

  switch (ruleType) {
    case 'machine_learning':
      return ['anomaly_threshold', 'machine_learning_job_id'];
    case 'threshold':
      return ['threshold', ...queryRuleParams];
    case 'threat_match':
    case 'query':
    case 'saved_query':
    case 'eql':
      return queryRuleParams;
  }
  assertUnreachable(ruleType);
};

export const getActionMessageRuleParams = (ruleType: Type): string[] => {
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
  ];

  const ruleParamsKeys = [
    ...commonRuleParamsKeys,
    ...getRuleSpecificRuleParamKeys(ruleType),
  ].sort();

  return ruleParamsKeys;
};

export const getActionMessageParams = memoizeOne((ruleType: Type | undefined): ActionVariables => {
  if (!ruleType) {
    return { state: [], params: [] };
  }
  const actionMessageRuleParams = getActionMessageRuleParams(ruleType);
  // Prefixes are being added automatically by the ActionTypeForm
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
});

// typed as null not undefined as the initial state for this value is null.
export const userHasPermissions = (canUserCRUD: boolean | null): boolean =>
  canUserCRUD != null ? canUserCRUD : true;

export const MaxWidthEuiFlexItem = styled(EuiFlexItem)`
  max-width: 1000px;
  overflow: hidden;
`;
