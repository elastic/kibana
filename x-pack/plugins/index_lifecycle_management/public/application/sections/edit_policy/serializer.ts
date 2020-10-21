/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { AllocateAction, SerializedPhase, SerializedPolicy } from '../../../../common/types';

import { FormInternal, DataAllocationMetaFields } from './types';
import { isNumber } from '../../services/policies/policy_serialization';

const unsafeSerializePhaseWithAllocation = (
  dataAllocationMetaFields: DataAllocationMetaFields,
  actions: SerializedPhase['actions'] = {},
  originalAllocation: AllocateAction = {}
) => {
  if (dataAllocationMetaFields.dataTierAllocationType === 'node_attrs') {
    if (dataAllocationMetaFields.allocationNodeAttribute) {
      const [name, value] = dataAllocationMetaFields.allocationNodeAttribute.split(':');
      actions.allocate = {
        // copy over any other allocate details like "number_of_replicas"
        ...actions.allocate,
        require: {
          [name]: value,
        },
      };
    }

    // copy over the original include and exclude values until we can set them in the form.
    if (!isEmpty(originalAllocation.include)) {
      actions.allocate = {
        ...actions.allocate,
        include: { ...originalAllocation.include },
      };
    }

    if (!isEmpty(originalAllocation.exclude)) {
      actions.allocate = {
        ...actions.allocate,
        exclude: { ...originalAllocation.exclude },
      };
    }
  } else if (dataAllocationMetaFields.dataTierAllocationType === 'none') {
    actions.migrate = { enabled: false };
    if (actions.allocate) {
      delete actions.allocate.require;
      delete actions.allocate.include;
      delete actions.allocate.exclude;
    }
  } else if (dataAllocationMetaFields.dataTierAllocationType === 'node_roles') {
    if (actions.allocate) {
      delete actions.allocate.require;
      delete actions.allocate.include;
      delete actions.allocate.exclude;
    }
    delete actions.migrate;
  }
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

    unsafeSerializePhaseWithAllocation(
      _meta.warm,
      policy.phases.warm.actions,
      originalPolicy?.phases.warm?.actions.allocate
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

  return policy;
};
