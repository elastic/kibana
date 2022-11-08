/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import {
  getRuleDetailsTabUrl,
  getRuleDetailsUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18nRules from './translations';
import type { RouteSpyState } from '../../../../common/utils/route/types';
import { SecurityPageName } from '../../../../app/types';
import { DEFAULT_THREAT_MATCH_QUERY, RULES_PATH } from '../../../../../common/constants';
import type { AboutStepRule, DefineStepRule, RuleStepsOrder, ScheduleStepRule } from './types';
import { DataSourceType, RuleStep } from './types';
import type { GetSecuritySolutionUrl } from '../../../../common/components/link_to';
import {
  RuleDetailTabs,
  RULE_DETAILS_TAB_NAME,
} from '../../../../detection_engine/rule_details_ui/pages/rule_details';
import { fillEmptySeverityMappings } from './helpers';

export const ruleStepsOrder: RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions,
];

const getRuleDetailsTabName = (tabName: string): string => {
  return RULE_DETAILS_TAB_NAME[tabName] ?? RULE_DETAILS_TAB_NAME[RuleDetailTabs.alerts];
};

const isRuleCreatePage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/create');

const isRuleEditPage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/edit');

export const getTrailingBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.ruleName,
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsUrl(params.detailName, ''),
        }),
      },
    ];
  }

  if (params.detailName && params.state?.ruleName && params.tabName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: getRuleDetailsTabName(params.tabName),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(params.detailName, params.tabName, ''),
        }),
      },
    ];
  }

  if (isRuleCreatePage(params.pathName)) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.ADD_PAGE_TITLE,
        href: '',
      },
    ];
  }

  if (isRuleEditPage(params.pathName) && params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.EDIT_PAGE_TITLE,
        href: '',
      },
    ];
  }

  return breadcrumb;
};

export const threatDefault = [
  {
    framework: 'MITRE ATT&CK',
    tactic: { id: 'none', name: 'none', reference: 'none' },
    technique: [],
  },
];

export const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
  indexPattern: { fields: [], title: '' },
  machineLearningJobId: [],
  ruleType: 'query',
  threatIndex: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  threatQueryBar: {
    query: { query: DEFAULT_THREAT_MATCH_QUERY, language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  threshold: {
    field: [],
    value: '200',
    cardinality: {
      field: [],
      value: '',
    },
  },
  timeline: {
    id: null,
    title: DEFAULT_TIMELINE_TITLE,
  },
  eqlOptions: {},
  dataSourceType: DataSourceType.IndexPatterns,
  newTermsFields: [],
  historyWindowSize: '7d',
  shouldLoadQueryDynamically: false,
};

export const stepAboutDefaultValue: AboutStepRule = {
  author: [],
  name: '',
  description: '',
  isAssociatedToEndpointList: false,
  isBuildingBlock: false,
  severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
  riskScore: { value: 21, mapping: [], isMappingChecked: false },
  references: [''],
  falsePositives: [''],
  license: '',
  ruleNameOverride: '',
  tags: [],
  timestampOverride: '',
  threat: threatDefault,
  note: '',
  threatIndicatorPath: undefined,
  timestampOverrideFallbackDisabled: undefined,
};

const DEFAULT_INTERVAL = '5m';
const DEFAULT_FROM = '1m';
const THREAT_MATCH_INTERVAL = '1h';
const THREAT_MATCH_FROM = '5m';

export const getStepScheduleDefaultValue = (ruleType: Type | undefined): ScheduleStepRule => {
  return {
    interval: isThreatMatchRule(ruleType) ? THREAT_MATCH_INTERVAL : DEFAULT_INTERVAL,
    from: isThreatMatchRule(ruleType) ? THREAT_MATCH_FROM : DEFAULT_FROM,
  };
};

/**
 * This default query will be used for threat query/indicator matches
 * as the default when the user swaps to using it by changing their
 * rule type from any rule type to the "threatMatchRule" type. Only
 * difference is that "*:*" is used instead of '' for its query.
 */
const threatQueryBarDefaultValue: DefineStepRule['queryBar'] = {
  ...stepDefineDefaultValue.queryBar,
  query: { ...stepDefineDefaultValue.queryBar.query, query: '*:*' },
};

export const defaultCustomQuery = {
  forNormalRules: stepDefineDefaultValue.queryBar,
  forThreatMatchRules: threatQueryBarDefaultValue,
};
