/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ACTION,
  FILTER_TYPE,
  APPLIES_TO,
  OPERATOR
} from '../../../common/constants/detector_rule';

import { cloneDeep } from 'lodash';
import { mlJobService } from 'plugins/ml/services/job_service';

export function getNewConditionDefaults() {
  return {
    applies_to: APPLIES_TO.ACTUAL,
    operator: OPERATOR.LESS_THAN,
    value: 1
  };
}

export function getNewRuleDefaults() {
  return {
    actions: [ACTION.SKIP_RESULT],
    conditions: []
  };
}

export function getScopeFieldDefaults(filterListIds) {
  const defaults = {
    filter_type: FILTER_TYPE.INCLUDE,
    enabled: false,   // UI-only property to show field as enabled in Scope section.
  };

  if (filterListIds !== undefined && filterListIds.length > 0) {
    defaults.filter_id = filterListIds[0];
  }

  return defaults;
}

export function isValidRule(rule) {
  // Runs simple checks to make sure the minimum set of
  // properties have values in the edited rule.
  let isValid = false;

  // Check an action has been supplied.
  const actions = rule.actions;
  if (actions.length > 0) {
    // Check either a condition or a scope property has been set.
    const conditions = rule.conditions;
    if (conditions !== undefined && conditions.length > 0) {
      isValid = true;
    } else {
      const scope = rule.scope;
      if (scope !== undefined) {
        isValid = Object.keys(scope).some(field => (scope[field].enabled === true));
      }
    }
  }

  return isValid;
}

export function saveJobRule(job, detectorIndex, ruleIndex, editedRule) {
  const detector = job.analysis_config.detectors[detectorIndex];

  // Filter out any scope expression where the UI=specific 'enabled'
  // property is set to false.
  const clonedRule = cloneDeep(editedRule);
  const scope = clonedRule.scope;
  if (scope !== undefined) {
    Object.keys(scope).forEach((field) => {
      if (scope[field].enabled === false) {
        delete scope[field];
      } else {
        // Remove the UI-only property as it is rejected by the endpoint.
        delete scope[field].enabled;
      }
    });
  }

  let rules = [];
  if (detector.custom_rules === undefined) {
    rules = [clonedRule];
  } else {
    rules = cloneDeep(detector.custom_rules);

    if (ruleIndex < rules.length) {
      // Edit to an existing rule.
      rules[ruleIndex] = clonedRule;
    } else {
      // Add a new rule.
      rules.push(clonedRule);
    }
  }

  return updateJobRules(job, detectorIndex, rules);
}

export function deleteJobRule(job, detectorIndex, ruleIndex) {
  const detector = job.analysis_config.detectors[detectorIndex];
  let customRules = [];
  if (detector.custom_rules !== undefined && ruleIndex < detector.custom_rules.length) {
    customRules = cloneDeep(detector.custom_rules);
    customRules.splice(ruleIndex, 1);
    return updateJobRules(job, detectorIndex, customRules);
  } else {
    return Promise.reject(new Error(
      `Rule no longer exists for detector index ${detectorIndex} in job ${job.job_id}`));
  }
}

export function updateJobRules(job, detectorIndex, rules) {
  // Pass just the detector with the edited rule to the updateJob endpoint.
  const jobId = job.job_id;
  const jobData = {
    detectors: [
      {
        detector_index: detectorIndex,
        custom_rules: rules
      }
    ]
  };

  // If created_by is set in the job's custom_settings, remove it as the rules
  // cannot currently be edited in the job wizards and so would be lost in a clone.
  let customSettings = {};
  if (job.custom_settings !== undefined) {
    customSettings = { ...job.custom_settings };
    delete customSettings.created_by;
    jobData.custom_settings = customSettings;
  }

  return new Promise((resolve, reject) => {
    mlJobService.updateJob(jobId, jobData)
      .then((resp) => {
        if (resp.success) {
          // Refresh the job data in the job service before resolving.
          mlJobService.refreshJob(jobId)
            .then(() => {
              resolve({ success: true });
            })
            .catch((refreshResp) => {
              reject(refreshResp);
            });
        } else {
          reject(resp);
        }
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

export function buildRuleDescription(rule) {
  const { actions, conditions, scope } = rule;
  let description = 'skip ';
  actions.forEach((action, i) => {
    if (i > 0) {
      description += ' AND ';
    }
    switch (action) {
      case ACTION.SKIP_RESULT:
        description += 'result';
        break;
      case ACTION.SKIP_MODEL_UPDATE:
        description += 'model update';
        break;
    }
  });

  description += ' when ';
  if (conditions !== undefined) {
    conditions.forEach((condition, i) => {
      if (i > 0) {
        description += ' AND ';
      }

      description += `${condition.applies_to} is ${operatorToText(condition.operator)} ${condition.value}`;
    });
  }

  if (scope !== undefined) {
    if (conditions !== undefined && conditions.length > 0) {
      description += ' AND ';
    }
    const fieldNames = Object.keys(scope);
    fieldNames.forEach((fieldName, i) => {
      if (i > 0) {
        description += ' AND ';
      }

      const filter = scope[fieldName];
      description += `${fieldName} is ${filterTypeToText(filter.filter_type)} ${filter.filter_id}`;
    });
  }

  return description;
}

export function filterTypeToText(filterType) {
  switch (filterType) {
    case FILTER_TYPE.INCLUDE:
      return 'in';

    case FILTER_TYPE.EXCLUDE:
      return 'not in';

    default:
      return filterType;
  }
}

export function appliesToText(appliesTo) {
  switch (appliesTo) {
    case APPLIES_TO.ACTUAL:
      return 'actual';

    case APPLIES_TO.TYPICAL:
      return 'typical';

    case APPLIES_TO.DIFF_FROM_TYPICAL:
      return 'diff from typical';

    default:
      return appliesTo;
  }
}

export function operatorToText(operator) {
  switch (operator) {
    case OPERATOR.LESS_THAN:
      return 'less than';

    case OPERATOR.LESS_THAN_OR_EQUAL:
      return 'less than or equal to';

    case OPERATOR.GREATER_THAN:
      return 'greater than';

    case OPERATOR.GREATER_THAN_OR_EQUAL:
      return 'greater than or equal to';

    default:
      return operator;
  }
}
