/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isNumber } from 'lodash';

import { SerializedPolicy, SerializedActionWithAllocation } from '../../../../../common/types';

import { FormInternal, DataAllocationMetaFields } from '../types';

const serializeAllocateAction = (
  { dataTierAllocationType, allocationNodeAttribute }: DataAllocationMetaFields,
  newActions: SerializedActionWithAllocation = {},
  originalActions: SerializedActionWithAllocation = {}
): SerializedActionWithAllocation => {
  const { allocate, migrate, ...rest } = newActions;
  // First copy over all non-allocate and migrate actions.
  const actions: SerializedActionWithAllocation = { allocate, migrate, ...rest };

  switch (dataTierAllocationType) {
    case 'node_attrs':
      if (allocationNodeAttribute) {
        const [name, value] = allocationNodeAttribute.split(':');
        actions.allocate = {
          // copy over any other allocate details like "number_of_replicas"
          ...actions.allocate,
          require: {
            [name]: value,
          },
        };
      } else {
        // The form has been configured to use node attribute based allocation but no node attribute
        // was selected. We fall back to what was originally selected in this case. This might be
        // migrate.enabled: "false"
        actions.migrate = originalActions.migrate;
      }

      // copy over the original include and exclude values until we can set them in the form.
      if (!isEmpty(originalActions?.allocate?.include)) {
        actions.allocate = {
          ...actions.allocate,
          include: { ...originalActions?.allocate?.include },
        };
      }

      if (!isEmpty(originalActions?.allocate?.exclude)) {
        actions.allocate = {
          ...actions.allocate,
          exclude: { ...originalActions?.allocate?.exclude },
        };
      }
      break;
    case 'none':
      actions.migrate = { enabled: false };
      break;
    default:
  }
  return actions;
};

export const createSerializer = (originalPolicy?: SerializedPolicy) => (
  data: FormInternal
): SerializedPolicy => {
  const { _meta, ...policy } = data;

  if (!policy.phases || !policy.phases.hot) {
    policy.phases = { hot: { actions: {} } };
  }

  /**
   * HOT PHASE SERIALIZATION
   */
  if (policy.phases.hot) {
    policy.phases.hot.min_age = originalPolicy?.phases.hot?.min_age ?? '0ms';
  }

  if (policy.phases.hot?.actions) {
    if (policy.phases.hot.actions?.rollover && _meta.hot.useRollover) {
      if (policy.phases.hot.actions.rollover.max_age) {
        policy.phases.hot.actions.rollover.max_age = `${policy.phases.hot.actions.rollover.max_age}${_meta.hot.maxAgeUnit}`;
      }

      if (policy.phases.hot.actions.rollover.max_size) {
        policy.phases.hot.actions.rollover.max_size = `${policy.phases.hot.actions.rollover.max_size}${_meta.hot.maxStorageSizeUnit}`;
      }

      if (_meta.hot.bestCompression && policy.phases.hot.actions?.forcemerge) {
        policy.phases.hot.actions.forcemerge.index_codec = 'best_compression';
      }
    } else {
      delete policy.phases.hot.actions?.rollover;
    }
  }

  /**
   * WARM PHASE SERIALIZATION
   */
  if (policy.phases.warm) {
    // If warm phase on rollover is enabled, delete min age field
    // An index lifecycle switches to warm phase when rollover occurs, so you cannot specify a warm phase time
    // They are mutually exclusive
    if (_meta.hot.useRollover && _meta.warm.warmPhaseOnRollover) {
      delete policy.phases.warm.min_age;
    } else if (
      (!_meta.hot.useRollover || !_meta.warm.warmPhaseOnRollover) &&
      policy.phases.warm.min_age
    ) {
      policy.phases.warm.min_age = `${policy.phases.warm.min_age}${_meta.warm.minAgeUnit}`;
    }

    policy.phases.warm.actions = serializeAllocateAction(
      _meta.warm,
      policy.phases.warm.actions,
      originalPolicy?.phases.warm?.actions
    );

    if (
      policy.phases.warm.actions.allocate &&
      !policy.phases.warm.actions.allocate.require &&
      !isNumber(policy.phases.warm.actions.allocate.number_of_replicas) &&
      isEmpty(policy.phases.warm.actions.allocate.include) &&
      isEmpty(policy.phases.warm.actions.allocate.exclude)
    ) {
      // remove allocate action if it does not define require or number of nodes
      // and both include and exclude are empty objects (ES will fail to parse if we don't)
      delete policy.phases.warm.actions.allocate;
    }

    if (_meta.warm.bestCompression && policy.phases.warm.actions?.forcemerge) {
      policy.phases.warm.actions.forcemerge.index_codec = 'best_compression';
    }
  }

  /**
   * COLD PHASE SERIALIZATION
   */
  if (policy.phases.cold) {
    if (policy.phases.cold.min_age) {
      policy.phases.cold.min_age = `${policy.phases.cold.min_age}${_meta.cold.minAgeUnit}`;
    }

    policy.phases.cold.actions = serializeAllocateAction(
      _meta.cold,
      policy.phases.cold.actions,
      originalPolicy?.phases.cold?.actions
    );

    if (
      policy.phases.cold.actions.allocate &&
      !policy.phases.cold.actions.allocate.require &&
      !isNumber(policy.phases.cold.actions.allocate.number_of_replicas) &&
      isEmpty(policy.phases.cold.actions.allocate.include) &&
      isEmpty(policy.phases.cold.actions.allocate.exclude)
    ) {
      // remove allocate action if it does not define require or number of nodes
      // and both include and exclude are empty objects (ES will fail to parse if we don't)
      delete policy.phases.cold.actions.allocate;
    }

    if (_meta.cold.freezeEnabled) {
      policy.phases.cold.actions.freeze = {};
    }
  }

  /**
   * DELETE PHASE SERIALIZATION
   */
  if (policy.phases.delete) {
    if (policy.phases.delete.min_age) {
      policy.phases.delete.min_age = `${policy.phases.delete.min_age}${_meta.delete.minAgeUnit}`;
    }

    if (originalPolicy?.phases.delete?.actions) {
      const { wait_for_snapshot: __, ...rest } = originalPolicy.phases.delete.actions;
      policy.phases.delete.actions = {
        ...policy.phases.delete.actions,
        ...rest,
      };
    }
  }

  return policy;
};
