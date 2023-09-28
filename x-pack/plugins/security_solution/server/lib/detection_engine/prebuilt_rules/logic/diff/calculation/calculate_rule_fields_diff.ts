/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../../common/utility_types';
import { invariant } from '../../../../../../../common/utils/invariant';

import type {
  AllFieldsDiff,
  DiffableAllFields,
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableRule,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
  CommonFieldsDiff,
  CustomQueryFieldsDiff,
  EqlFieldsDiff,
  EsqlFieldsDiff,
  MachineLearningFieldsDiff,
  NewTermsFieldsDiff,
  RuleFieldsDiff,
  SavedQueryFieldsDiff,
  ThreatMatchFieldsDiff,
  ThresholdFieldsDiff,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';

import type { FieldsDiffAlgorithmsFor } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/fields_diff';
import type { ThreeVersionsOf } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff';
import { MissingVersion } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff';
import { calculateFieldsDiffFor } from './diff_calculation_helpers';
import { simpleDiffAlgorithm } from './algorithms/simple_diff_algorithm';

const BASE_TYPE_ERROR = `Base version can't be of different rule type`;
const TARGET_TYPE_ERROR = `Target version can't be of different rule type`;

/**
 * Calculates a three-way diff per each top-level rule field.
 * Returns an object which keys are equal to rule's field names and values are
 * three-way diffs calculated for those fields.
 */
export const calculateRuleFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableRule>
): RuleFieldsDiff => {
  const commonFieldsDiff = calculateCommonFieldsDiff(ruleVersions);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { base_version, current_version, target_version } = ruleVersions;
  const hasBaseVersion = base_version !== MissingVersion;

  const isRuleTypeDifferentInTargetVersion = current_version.type !== target_version.type;
  const isRuleTypeDifferentInBaseVersion = hasBaseVersion
    ? current_version.type !== base_version.type
    : false;

  if (isRuleTypeDifferentInTargetVersion || isRuleTypeDifferentInBaseVersion) {
    // If rule type has been changed by Elastic in the target version (can happen)
    // or by user in the current version (should never happen), we can't calculate the diff
    // only for fields of a single rule type, and need to calculate it for all fields
    // of all the rule types we have.
    // TODO: Try to get rid of "as" casting
    return calculateAllFieldsDiff({
      base_version: base_version as DiffableAllFields | MissingVersion,
      current_version: current_version as DiffableAllFields,
      target_version: target_version as DiffableAllFields,
    }) as RuleFieldsDiff;
  }

  switch (current_version.type) {
    case 'query': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'query', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'query', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateCustomQueryFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'saved_query': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'saved_query', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'saved_query', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateSavedQueryFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'eql': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'eql', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'eql', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateEqlFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'threat_match': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'threat_match', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'threat_match', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateThreatMatchFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'threshold': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'threshold', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'threshold', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateThresholdFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'machine_learning': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'machine_learning', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'machine_learning', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateMachineLearningFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'new_terms': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'new_terms', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'new_terms', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateNewTermsFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    case 'esql': {
      if (hasBaseVersion) {
        invariant(base_version.type === 'esql', BASE_TYPE_ERROR);
      }
      invariant(target_version.type === 'esql', TARGET_TYPE_ERROR);
      return {
        ...commonFieldsDiff,
        ...calculateEsqlFieldsDiff({ base_version, current_version, target_version }),
      };
    }
    default: {
      return assertUnreachable(current_version, 'Unhandled rule type');
    }
  }
};

const calculateCommonFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableCommonFields>
): CommonFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, commonFieldsDiffAlgorithms);
};

const commonFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableCommonFields> = {
  rule_id: simpleDiffAlgorithm,
  version: simpleDiffAlgorithm,
  meta: simpleDiffAlgorithm,
  name: simpleDiffAlgorithm,
  tags: simpleDiffAlgorithm,
  description: simpleDiffAlgorithm,
  severity: simpleDiffAlgorithm,
  severity_mapping: simpleDiffAlgorithm,
  risk_score: simpleDiffAlgorithm,
  risk_score_mapping: simpleDiffAlgorithm,
  references: simpleDiffAlgorithm,
  false_positives: simpleDiffAlgorithm,
  threat: simpleDiffAlgorithm,
  note: simpleDiffAlgorithm,
  setup: simpleDiffAlgorithm,
  related_integrations: simpleDiffAlgorithm,
  required_fields: simpleDiffAlgorithm,
  author: simpleDiffAlgorithm,
  license: simpleDiffAlgorithm,
  rule_schedule: simpleDiffAlgorithm,
  actions: simpleDiffAlgorithm,
  throttle: simpleDiffAlgorithm,
  exceptions_list: simpleDiffAlgorithm,
  max_signals: simpleDiffAlgorithm,
  rule_name_override: simpleDiffAlgorithm,
  timestamp_override: simpleDiffAlgorithm,
  timeline_template: simpleDiffAlgorithm,
  building_block: simpleDiffAlgorithm,
};

const calculateCustomQueryFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableCustomQueryFields>
): CustomQueryFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, customQueryFieldsDiffAlgorithms);
};

const customQueryFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableCustomQueryFields> = {
  type: simpleDiffAlgorithm,
  kql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateSavedQueryFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableSavedQueryFields>
): SavedQueryFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, savedQueryFieldsDiffAlgorithms);
};

const savedQueryFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableSavedQueryFields> = {
  type: simpleDiffAlgorithm,
  kql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  alert_suppression: simpleDiffAlgorithm,
};

const calculateEqlFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableEqlFields>
): EqlFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, eqlFieldsDiffAlgorithms);
};

const eqlFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableEqlFields> = {
  type: simpleDiffAlgorithm,
  eql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  event_category_override: simpleDiffAlgorithm,
  timestamp_field: simpleDiffAlgorithm,
  tiebreaker_field: simpleDiffAlgorithm,
};

const calculateEsqlFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableEsqlFields>
): EsqlFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, esqlFieldsDiffAlgorithms);
};

const esqlFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableEsqlFields> = {
  type: simpleDiffAlgorithm,
  esql_query: simpleDiffAlgorithm,
};

const calculateThreatMatchFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableThreatMatchFields>
): ThreatMatchFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, threatMatchFieldsDiffAlgorithms);
};

const threatMatchFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableThreatMatchFields> = {
  type: simpleDiffAlgorithm,
  kql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  threat_query: simpleDiffAlgorithm,
  threat_index: simpleDiffAlgorithm,
  threat_mapping: simpleDiffAlgorithm,
  threat_indicator_path: simpleDiffAlgorithm,
  concurrent_searches: simpleDiffAlgorithm,
  items_per_search: simpleDiffAlgorithm,
};

const calculateThresholdFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableThresholdFields>
): ThresholdFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, thresholdFieldsDiffAlgorithms);
};

const thresholdFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableThresholdFields> = {
  type: simpleDiffAlgorithm,
  kql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  threshold: simpleDiffAlgorithm,
};

const calculateMachineLearningFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableMachineLearningFields>
): MachineLearningFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, machineLearningFieldsDiffAlgorithms);
};

const machineLearningFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableMachineLearningFields> =
  {
    type: simpleDiffAlgorithm,
    machine_learning_job_id: simpleDiffAlgorithm,
    anomaly_threshold: simpleDiffAlgorithm,
  };

const calculateNewTermsFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableNewTermsFields>
): NewTermsFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, newTermsFieldsDiffAlgorithms);
};

const newTermsFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableNewTermsFields> = {
  type: simpleDiffAlgorithm,
  kql_query: simpleDiffAlgorithm,
  data_source: simpleDiffAlgorithm,
  new_terms_fields: simpleDiffAlgorithm,
  history_window_start: simpleDiffAlgorithm,
};

const calculateAllFieldsDiff = (
  ruleVersions: ThreeVersionsOf<DiffableAllFields>
): AllFieldsDiff => {
  return calculateFieldsDiffFor(ruleVersions, allFieldsDiffAlgorithms);
};

const allFieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<DiffableAllFields> = {
  ...commonFieldsDiffAlgorithms,
  ...customQueryFieldsDiffAlgorithms,
  ...savedQueryFieldsDiffAlgorithms,
  ...eqlFieldsDiffAlgorithms,
  ...threatMatchFieldsDiffAlgorithms,
  ...thresholdFieldsDiffAlgorithms,
  ...machineLearningFieldsDiffAlgorithms,
  ...newTermsFieldsDiffAlgorithms,
  type: simpleDiffAlgorithm,
};
