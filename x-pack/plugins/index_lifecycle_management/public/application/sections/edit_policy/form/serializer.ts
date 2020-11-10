/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';

import { isEmpty, merge } from 'lodash';

import { SerializedPolicy, SerializedActionWithAllocation } from '../../../../../common/types';

import { defaultPolicy } from '../../../constants';

import { FormInternal, DataAllocationMetaFields } from '../types';

const serializeAllocateAction = (
  { dataTierAllocationType, allocationNodeAttribute }: DataAllocationMetaFields,
  newActions: SerializedActionWithAllocation = {},
  originalActions: SerializedActionWithAllocation = {}
): SerializedActionWithAllocation => {
  const { allocate, migrate, ...rest } = newActions;
  // First copy over all non-require|include|exclude and migrate actions.
  const actions: SerializedActionWithAllocation = { ...rest };

  // We only set include, exclude and require here, so copy over all other values
  if (allocate) {
    const { include, exclude, require, ...restAllocate } = allocate;
    if (!isEmpty(restAllocate)) {
      actions.allocate = { ...restAllocate };
    }
  }

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
  const { _meta, ...updatedPolicy } = data;

  if (!updatedPolicy.phases || !updatedPolicy.phases.hot) {
    updatedPolicy.phases = { hot: { actions: {} } };
  }

  return produce<SerializedPolicy>(originalPolicy ?? defaultPolicy, (draft) => {
    // Copy over all updated fields
    merge(draft, updatedPolicy);

    // Next copy over all meta fields and delete any fields that have been removed
    // by fields exposed in the form. It is very important that we do not delete
    // data that the form does not control! E.g., unfollow action in hot phase.

    /**
     * HOT PHASE SERIALIZATION
     */
    if (draft.phases.hot) {
      draft.phases.hot.min_age = draft.phases.hot.min_age ?? '0ms';
    }

    if (draft.phases.hot?.actions) {
      if (draft.phases.hot.actions?.rollover && _meta.hot.useRollover) {
        if (draft.phases.hot.actions.rollover.max_age) {
          draft.phases.hot.actions.rollover.max_age = `${draft.phases.hot.actions.rollover.max_age}${_meta.hot.maxAgeUnit}`;
        }

        if (draft.phases.hot.actions.rollover.max_size) {
          draft.phases.hot.actions.rollover.max_size = `${draft.phases.hot.actions.rollover.max_size}${_meta.hot.maxStorageSizeUnit}`;
        }

        if (_meta.hot.bestCompression && draft.phases.hot.actions?.forcemerge) {
          draft.phases.hot.actions.forcemerge.index_codec = 'best_compression';
        }
      } else {
        delete draft.phases.hot.actions.rollover;
        delete draft.phases.hot.actions.forcemerge;
      }

      if (
        !updatedPolicy.phases.hot!.actions?.set_priority &&
        draft.phases.hot.actions.set_priority
      ) {
        delete draft.phases.hot.actions.set_priority;
      }
    }

    /**
     * WARM PHASE SERIALIZATION
     */
    if (_meta.warm.enabled) {
      const warmPhase = draft.phases.warm!;
      // If warm phase on rollover is enabled, delete min age field
      // An index lifecycle switches to warm phase when rollover occurs, so you cannot specify a warm phase time
      // They are mutually exclusive
      if (
        (!_meta.hot.useRollover || !_meta.warm.warmPhaseOnRollover) &&
        updatedPolicy.phases.warm!.min_age
      ) {
        warmPhase.min_age = `${updatedPolicy.phases.warm!.min_age}${_meta.warm.minAgeUnit}`;
      } else {
        delete warmPhase.min_age;
      }

      warmPhase.actions = serializeAllocateAction(
        _meta.warm,
        warmPhase.actions,
        originalPolicy?.phases.warm?.actions
      );

      if (!updatedPolicy.phases.warm!.actions?.forcemerge) {
        delete warmPhase.actions.forcemerge;
      } else if (_meta.warm.bestCompression) {
        warmPhase.actions.forcemerge!.index_codec = 'best_compression';
      }

      if (!updatedPolicy.phases.warm!.actions?.set_priority && warmPhase.actions.set_priority) {
        delete warmPhase.actions.set_priority;
      }

      if (!updatedPolicy.phases.warm!.actions?.shrink) {
        delete warmPhase.actions.shrink;
      }
    } else {
      delete draft.phases.warm;
    }

    /**
     * COLD PHASE SERIALIZATION
     */
    if (_meta.cold.enabled) {
      const coldPhase = draft.phases.cold!;

      if (updatedPolicy.phases.cold!.min_age) {
        coldPhase.min_age = `${updatedPolicy.phases.cold!.min_age}${_meta.cold.minAgeUnit}`;
      }

      coldPhase.actions = serializeAllocateAction(
        _meta.cold,
        coldPhase.actions,
        originalPolicy?.phases.cold?.actions
      );

      if (_meta.cold.freezeEnabled) {
        coldPhase.actions.freeze = {};
      } else {
        delete coldPhase.actions.freeze;
      }

      if (!updatedPolicy.phases.cold!.actions?.set_priority && coldPhase.actions.set_priority) {
        delete coldPhase.actions.set_priority;
      }
    } else {
      delete draft.phases.cold;
    }

    /**
     * DELETE PHASE SERIALIZATION
     */
    if (_meta.delete.enabled) {
      const deletePhase = draft.phases.delete!;
      if (updatedPolicy.phases.delete!.min_age) {
        deletePhase.min_age = `${updatedPolicy.phases.delete!.min_age}${_meta.delete.minAgeUnit}`;
      }

      if (
        !updatedPolicy.phases.delete!.actions?.wait_for_snapshot &&
        deletePhase.actions.wait_for_snapshot
      ) {
        delete deletePhase.actions.wait_for_snapshot;
      }
    } else {
      delete draft.phases.delete;
    }
  });
};
