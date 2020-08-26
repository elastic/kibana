/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { Pager } from '@elastic/eui';

import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_NODE_ATTRS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ENABLED,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS,
  WARM_PHASE_ON_ROLLOVER,
  PHASE_SHRINK_ENABLED,
  PHASE_FREEZE_ENABLED,
  PHASE_INDEX_PRIORITY,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
  PHASE_WAIT_FOR_SNAPSHOT_POLICY,
} from '../../constants';

import { filterItems, sortTable } from '../../services';

import {
  defaultEmptyDeletePhase,
  defaultEmptyColdPhase,
  defaultEmptyWarmPhase,
  defaultEmptyHotPhase,
} from '../defaults';

export const getPolicies = (state) => state.policies.policies;
export const getPolicyByName = (state, name) =>
  getPolicies(state).find((policy) => policy.name === name) || {};
export const getIsNewPolicy = (state) => state.policies.selectedPolicy.isNew;
export const getSelectedPolicy = (state) => state.policies.selectedPolicy;
export const getIsSelectedPolicySet = (state) => state.policies.selectedPolicySet;
export const getSelectedOriginalPolicyName = (state) => state.policies.originalPolicyName;
export const getPolicyFilter = (state) => state.policies.filter;
export const getPolicySort = (state) => state.policies.sort;
export const getPolicyCurrentPage = (state) => state.policies.currentPage;
export const getPolicyPageSize = (state) => state.policies.pageSize;
export const isPolicyListLoaded = (state) => state.policies.isLoaded;

const getFilteredPolicies = createSelector(getPolicies, getPolicyFilter, (policies, filter) => {
  return filterItems(['name'], filter, policies);
});
export const getTotalPolicies = createSelector(getFilteredPolicies, (filteredPolicies) => {
  return filteredPolicies.length;
});
export const getPolicyPager = createSelector(
  getPolicyCurrentPage,
  getPolicyPageSize,
  getTotalPolicies,
  (currentPage, pageSize, totalPolicies) => {
    return new Pager(totalPolicies, pageSize, currentPage);
  }
);
export const getPageOfPolicies = createSelector(
  getFilteredPolicies,
  getPolicySort,
  getPolicyPager,
  (filteredPolicies, sort, pager) => {
    const sortedPolicies = sortTable(filteredPolicies, sort.sortField, sort.isSortAscending);
    const { firstItemIndex, lastItemIndex } = pager;
    const pagedPolicies = sortedPolicies.slice(firstItemIndex, lastItemIndex + 1);
    return pagedPolicies;
  }
);
export const getSaveAsNewPolicy = (state) => state.policies.selectedPolicy.saveAsNew;

export const getSelectedPolicyName = (state) => {
  if (!getSaveAsNewPolicy(state)) {
    return getSelectedOriginalPolicyName(state);
  }
  return state.policies.selectedPolicy.name;
};

export const getPhases = (state) => state.policies.selectedPolicy.phases;

export const getPhase = (state, phase) => getPhases(state)[phase];

export const getPhaseData = (state, phase, key) => {
  if (PHASE_ATTRIBUTES_THAT_ARE_NUMBERS.includes(key)) {
    return parseInt(getPhase(state, phase)[key]);
  }
  return getPhase(state, phase)[key];
};

export const splitSizeAndUnits = (field) => {
  let size;
  let units;

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = parseInt(result[1]) || 0;
    units = result[2];
  }

  return {
    size,
    units,
  };
};

export const isNumber = (value) => typeof value === 'number';
export const isEmptyObject = (obj) => {
  return !obj || (Object.entries(obj).length === 0 && obj.constructor === Object);
};

const phaseFromES = (phase, phaseName, defaultEmptyPolicy) => {
  const policy = { ...defaultEmptyPolicy };
  if (!phase) {
    return policy;
  }

  policy[PHASE_ENABLED] = true;

  if (phase.min_age) {
    if (phaseName === PHASE_WARM && phase.min_age === '0ms') {
      policy[WARM_PHASE_ON_ROLLOVER] = true;
    } else {
      const { size: minAge, units: minAgeUnits } = splitSizeAndUnits(phase.min_age);
      policy[PHASE_ROLLOVER_MINIMUM_AGE] = minAge;
      policy[PHASE_ROLLOVER_MINIMUM_AGE_UNITS] = minAgeUnits;
    }
  }
  if (phaseName === PHASE_WARM) {
    policy[PHASE_SHRINK_ENABLED] = false;
    policy[PHASE_FORCE_MERGE_ENABLED] = false;
  }
  if (phase.actions) {
    const actions = phase.actions;

    if (actions.rollover) {
      const rollover = actions.rollover;
      policy[PHASE_ROLLOVER_ENABLED] = true;
      if (rollover.max_age) {
        const { size: maxAge, units: maxAgeUnits } = splitSizeAndUnits(rollover.max_age);
        policy[PHASE_ROLLOVER_MAX_AGE] = maxAge;
        policy[PHASE_ROLLOVER_MAX_AGE_UNITS] = maxAgeUnits;
      }
      if (rollover.max_size) {
        const { size: maxSize, units: maxSizeUnits } = splitSizeAndUnits(rollover.max_size);
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED] = maxSize;
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS] = maxSizeUnits;
      }
      if (rollover.max_docs) {
        policy[PHASE_ROLLOVER_MAX_DOCUMENTS] = rollover.max_docs;
      }
    }

    if (actions.allocate) {
      const allocate = actions.allocate;
      if (allocate.require) {
        Object.entries(allocate.require).forEach((entry) => {
          policy[PHASE_NODE_ATTRS] = entry.join(':');
        });
        // checking for null or undefined here
        if (allocate.number_of_replicas != null) {
          policy[PHASE_REPLICA_COUNT] = allocate.number_of_replicas;
        }
      }
    }

    if (actions.forcemerge) {
      const forcemerge = actions.forcemerge;
      policy[PHASE_FORCE_MERGE_ENABLED] = true;
      policy[PHASE_FORCE_MERGE_SEGMENTS] = forcemerge.max_num_segments;
    }

    if (actions.shrink) {
      policy[PHASE_SHRINK_ENABLED] = true;
      policy[PHASE_PRIMARY_SHARD_COUNT] = actions.shrink.number_of_shards;
    }

    if (actions.freeze) {
      policy[PHASE_FREEZE_ENABLED] = true;
    }

    if (actions.set_priority) {
      const { priority } = actions.set_priority;

      policy[PHASE_INDEX_PRIORITY] = priority ?? '';
    }

    if (actions.wait_for_snapshot) {
      policy[PHASE_WAIT_FOR_SNAPSHOT_POLICY] = actions.wait_for_snapshot.policy;
    }
  }
  return policy;
};

export const policyFromES = (policy) => {
  const {
    name,
    policy: { phases },
  } = policy;

  return {
    name,
    phases: {
      [PHASE_HOT]: phaseFromES(phases[PHASE_HOT], PHASE_HOT, defaultEmptyHotPhase),
      [PHASE_WARM]: phaseFromES(phases[PHASE_WARM], PHASE_WARM, defaultEmptyWarmPhase),
      [PHASE_COLD]: phaseFromES(phases[PHASE_COLD], PHASE_COLD, defaultEmptyColdPhase),
      [PHASE_DELETE]: phaseFromES(phases[PHASE_DELETE], PHASE_DELETE, defaultEmptyDeletePhase),
    },
    isNew: false,
    saveAsNew: false,
  };
};

export const phaseToES = (phase, originalEsPhase) => {
  const esPhase = { ...originalEsPhase };

  if (!phase[PHASE_ENABLED]) {
    return {};
  }
  if (isNumber(phase[PHASE_ROLLOVER_MINIMUM_AGE])) {
    esPhase.min_age = `${phase[PHASE_ROLLOVER_MINIMUM_AGE]}${phase[PHASE_ROLLOVER_MINIMUM_AGE_UNITS]}`;
  }

  // If warm phase on rollover is enabled, delete min age field
  // An index lifecycle switches to warm phase when rollover occurs, so you cannot specify a warm phase time
  // They are mutually exclusive
  if (phase[WARM_PHASE_ON_ROLLOVER]) {
    delete esPhase.min_age;
  }

  esPhase.actions = esPhase.actions || {};

  if (phase[PHASE_ROLLOVER_ENABLED]) {
    esPhase.actions.rollover = {};

    if (isNumber(phase[PHASE_ROLLOVER_MAX_AGE])) {
      esPhase.actions.rollover.max_age = `${phase[PHASE_ROLLOVER_MAX_AGE]}${phase[PHASE_ROLLOVER_MAX_AGE_UNITS]}`;
    }
    if (isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED])) {
      esPhase.actions.rollover.max_size = `${phase[PHASE_ROLLOVER_MAX_SIZE_STORED]}${phase[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]}`;
    }
    if (isNumber(phase[PHASE_ROLLOVER_MAX_DOCUMENTS])) {
      esPhase.actions.rollover.max_docs = phase[PHASE_ROLLOVER_MAX_DOCUMENTS];
    }
  } else {
    delete esPhase.actions.rollover;
  }
  if (phase[PHASE_NODE_ATTRS]) {
    const [name, value] = phase[PHASE_NODE_ATTRS].split(':');
    esPhase.actions.allocate = esPhase.actions.allocate || {};
    esPhase.actions.allocate.require = {
      [name]: value,
    };
  } else {
    if (esPhase.actions.allocate) {
      delete esPhase.actions.allocate.require;
    }
  }
  if (isNumber(phase[PHASE_REPLICA_COUNT])) {
    esPhase.actions.allocate = esPhase.actions.allocate || {};
    esPhase.actions.allocate.number_of_replicas = phase[PHASE_REPLICA_COUNT];
  } else {
    if (esPhase.actions.allocate) {
      delete esPhase.actions.allocate.number_of_replicas;
    }
  }
  if (
    esPhase.actions.allocate &&
    !esPhase.actions.allocate.require &&
    !isNumber(esPhase.actions.allocate.number_of_replicas) &&
    isEmptyObject(esPhase.actions.allocate.include) &&
    isEmptyObject(esPhase.actions.allocate.exclude)
  ) {
    // remove allocate action if it does not define require or number of nodes
    // and both include and exclude are empty objects (ES will fail to parse if we don't)
    delete esPhase.actions.allocate;
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    esPhase.actions.forcemerge = {
      max_num_segments: phase[PHASE_FORCE_MERGE_SEGMENTS],
    };
  } else {
    delete esPhase.actions.forcemerge;
  }

  if (phase[PHASE_SHRINK_ENABLED] && isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
    esPhase.actions.shrink = {
      number_of_shards: phase[PHASE_PRIMARY_SHARD_COUNT],
    };
  } else {
    delete esPhase.actions.shrink;
  }

  if (phase[PHASE_FREEZE_ENABLED]) {
    esPhase.actions.freeze = {};
  } else {
    delete esPhase.actions.freeze;
  }
  if (isNumber(phase[PHASE_INDEX_PRIORITY])) {
    esPhase.actions.set_priority = {
      priority: phase[PHASE_INDEX_PRIORITY],
    };
  } else if (phase[PHASE_INDEX_PRIORITY] === '') {
    esPhase.actions.set_priority = {
      priority: null,
    };
  }

  if (phase[PHASE_WAIT_FOR_SNAPSHOT_POLICY]) {
    esPhase.actions.wait_for_snapshot = {
      policy: phase[PHASE_WAIT_FOR_SNAPSHOT_POLICY],
    };
  } else {
    delete esPhase.actions.wait_for_snapshot;
  }
  return esPhase;
};
