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
import { ml } from '../../services/ml_api_service';
import { mlJobService } from '../../services/job_service';
import { i18n } from '@kbn/i18n';

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
      i18n.translate('xpack.ml.ruleEditor.deleteJobRule.ruleNoLongerExistsErrorMessage', {
        defaultMessage: 'Rule no longer exists for detector index {detectorIndex} in job {jobId}',
        values: {
          detectorIndex,
          jobId: job.job_id
        }
      })
    ));
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

// Updates an ML filter used in the scope part of a rule,
// adding an item to the filter with the specified ID.
export function addItemToFilter(item, filterId) {
  return new Promise((resolve, reject) => {
    ml.filters.updateFilter(
      filterId,
      undefined,
      [item],
      undefined
    )
      .then((updatedFilter) => {
        resolve(updatedFilter);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function buildRuleDescription(rule) {
  const { actions, conditions, scope } = rule;
  let actionsText = '';
  let conditionsText = '';
  let filtersText = '';

  actions.forEach((action, i) => {
    if (i > 0) {
      actionsText += ' AND ';
    }
    switch (action) {
      case ACTION.SKIP_RESULT:
        actionsText += i18n.translate('xpack.ml.ruleEditor.ruleDescription.resultActionTypeText', {
          defaultMessage: 'result',
          description: 'Part of composite text: xpack.ml.ruleEditor.ruleDescription.[actionName]ActionTypeText +' +
            'xpack.ml.ruleEditor.ruleDescription.conditionsText + xpack.ml.ruleEditor.ruleDescription.filtersText'
        });
        break;
      case ACTION.SKIP_MODEL_UPDATE:
        actionsText += i18n.translate('xpack.ml.ruleEditor.ruleDescription.modelUpdateActionTypeText', {
          defaultMessage: 'model update',
          description: 'Part of composite text: xpack.ml.ruleEditor.ruleDescription.[actionName]ActionTypeText + ' +
            'xpack.ml.ruleEditor.ruleDescription.conditionsText + xpack.ml.ruleEditor.ruleDescription.filtersText'
        });
        break;
    }
  });

  if (conditions !== undefined) {
    conditions.forEach((condition, i) => {
      if (i > 0) {
        conditionsText += ' AND ';
      }
      conditionsText += i18n.translate('xpack.ml.ruleEditor.ruleDescription.conditionsText', {
        defaultMessage: '{appliesTo} is {operator} {value}',
        values: { appliesTo: appliesToText(condition.applies_to), operator: operatorToText(condition.operator), value: condition.value },
        description: 'Part of composite text: xpack.ml.ruleEditor.ruleDescription.[actionName]ActionTypeText + ' +
          'xpack.ml.ruleEditor.ruleDescription.conditionsText + xpack.ml.ruleEditor.ruleDescription.filtersText'
      });
    });
  }

  if (scope !== undefined) {
    if (conditions !== undefined && conditions.length > 0) {
      filtersText += ' AND ';
    }
    const fieldNames = Object.keys(scope);
    fieldNames.forEach((fieldName, i) => {
      if (i > 0) {
        filtersText += ' AND ';
      }

      const filter = scope[fieldName];
      filtersText += i18n.translate('xpack.ml.ruleEditor.ruleDescription.filtersText', {
        defaultMessage: '{fieldName} is {filterType} {filterId}',
        values: { fieldName, filterType: filterTypeToText(filter.filter_type), filterId: filter.filter_id },
        description: 'Part of composite text: xpack.ml.ruleEditor.ruleDescription.[actionName]ActionTypeText + ' +
          'xpack.ml.ruleEditor.ruleDescription.conditionsText + xpack.ml.ruleEditor.ruleDescription.filtersText'
      });
    });
  }

  return i18n.translate('xpack.ml.ruleEditor.ruleDescription', {
    defaultMessage: 'skip {actions} when {conditions}{filters}',
    values: {
      actions: actionsText,
      conditions: conditionsText,
      filters: filtersText
    },
    description: 'Composite text: xpack.ml.ruleEditor.ruleDescription.[actionName]ActionTypeText + ' +
      'xpack.ml.ruleEditor.ruleDescription.conditionsText + xpack.ml.ruleEditor.ruleDescription.filtersText.' +
      ' (Example: skip model update when actual is less than 1 AND ip is in xxx)'
  });
}

export function filterTypeToText(filterType) {
  switch (filterType) {
    case FILTER_TYPE.INCLUDE:
      return i18n.translate('xpack.ml.ruleEditor.includeFilterTypeText', { defaultMessage: 'in' });
    case FILTER_TYPE.EXCLUDE:
      return i18n.translate('xpack.ml.ruleEditor.excludeFilterTypeText', { defaultMessage: 'not in' });

    default:
      return (filterType !== undefined) ? filterType : '';
  }
}

export function appliesToText(appliesTo) {
  switch (appliesTo) {
    case APPLIES_TO.ACTUAL:
      return i18n.translate('xpack.ml.ruleEditor.actualAppliesTypeText', { defaultMessage: 'actual' });
    case APPLIES_TO.TYPICAL:
      return i18n.translate('xpack.ml.ruleEditor.typicalAppliesTypeText', { defaultMessage: 'typical' });

    case APPLIES_TO.DIFF_FROM_TYPICAL:
      return i18n.translate('xpack.ml.ruleEditor.diffFromTypicalAppliesTypeText', { defaultMessage: 'diff from typical' });

    default:
      return (appliesTo !== undefined) ? appliesTo : '';
  }
}

export function operatorToText(operator) {
  switch (operator) {
    case OPERATOR.LESS_THAN:
      return i18n.translate('xpack.ml.ruleEditor.lessThanOperatorTypeText', { defaultMessage: 'less than' });

    case OPERATOR.LESS_THAN_OR_EQUAL:
      return i18n.translate('xpack.ml.ruleEditor.lessThanOrEqualToOperatorTypeText', { defaultMessage: 'less than or equal to' });

    case OPERATOR.GREATER_THAN:
      return i18n.translate('xpack.ml.ruleEditor.greaterThanOperatorTypeText', { defaultMessage: 'greater than' });

    case OPERATOR.GREATER_THAN_OR_EQUAL:
      return i18n.translate('xpack.ml.ruleEditor.greaterThanOrEqualToOperatorTypeText', { defaultMessage: 'greater than or equal to' });

    default:
      return (operator !== undefined) ? operator : '';
  }
}

// Returns the value of the selected 'applies_to' field from the
// selected anomaly i.e. the actual, typical or diff from typical.
export function getAppliesToValueFromAnomaly(anomaly, appliesTo) {
  let actualValue;
  let typicalValue;

  const actual = anomaly.actual;
  if (actual !== undefined) {
    actualValue = Array.isArray(actual) ? actual[0] : actual;
  }

  const typical = anomaly.typical;
  if (typical !== undefined) {
    typicalValue = Array.isArray(typical) ? typical[0] : typical;
  }

  switch (appliesTo) {
    case APPLIES_TO.ACTUAL:
      return actualValue;

    case APPLIES_TO.TYPICAL:
      return typicalValue;

    case APPLIES_TO.DIFF_FROM_TYPICAL:
      if (actual !== undefined && typical !== undefined) {
        return Math.abs(actualValue - typicalValue);
      }
  }

  return undefined;
}
