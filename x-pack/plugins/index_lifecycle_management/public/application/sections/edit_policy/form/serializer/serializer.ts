/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';

import { merge, cloneDeep } from 'lodash';

import { SerializedPolicy } from '../../../../../../common/types';

import { defaultPolicy, defaultRolloverAction } from '../../../../constants';

import { FormInternal } from '../../types';

import { serializeMigrateAndAllocateActions } from './serialize_migrate_and_allocate_actions';

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
      const hotPhaseActions = draft.phases.hot.actions;
      if (_meta.hot.isUsingDefaultRollover) {
        hotPhaseActions.rollover = cloneDeep(defaultRolloverAction);
      } else if (hotPhaseActions.rollover && _meta.hot.useRollover) {
        if (updatedPolicy.phases.hot!.actions.rollover?.max_age) {
          hotPhaseActions.rollover.max_age = `${hotPhaseActions.rollover.max_age}${_meta.hot.maxAgeUnit}`;
        } else {
          delete hotPhaseActions.rollover.max_age;
        }

        if (typeof updatedPolicy.phases.hot!.actions.rollover?.max_docs !== 'number') {
          delete hotPhaseActions.rollover.max_docs;
        }

        if (updatedPolicy.phases.hot!.actions.rollover?.max_size) {
          hotPhaseActions.rollover.max_size = `${hotPhaseActions.rollover.max_size}${_meta.hot.maxStorageSizeUnit}`;
        } else {
          delete hotPhaseActions.rollover.max_size;
        }

        if (!updatedPolicy.phases.hot!.actions?.forcemerge) {
          delete hotPhaseActions.forcemerge;
        } else if (_meta.hot.bestCompression) {
          hotPhaseActions.forcemerge!.index_codec = 'best_compression';
        } else {
          delete hotPhaseActions.forcemerge!.index_codec;
        }

        if (_meta.hot.bestCompression && hotPhaseActions.forcemerge) {
          hotPhaseActions.forcemerge.index_codec = 'best_compression';
        }

        if (_meta.hot.readonlyEnabled) {
          hotPhaseActions.readonly = hotPhaseActions.readonly ?? {};
        } else {
          delete hotPhaseActions.readonly;
        }
      } else {
        delete hotPhaseActions.rollover;
        delete hotPhaseActions.forcemerge;
        delete hotPhaseActions.readonly;
      }

      if (!updatedPolicy.phases.hot!.actions?.set_priority) {
        delete hotPhaseActions.set_priority;
      }

      if (!updatedPolicy.phases.hot?.actions?.shrink) {
        delete hotPhaseActions.shrink;
      }

      if (!updatedPolicy.phases.hot!.actions?.searchable_snapshot) {
        delete hotPhaseActions.searchable_snapshot;
      }
    }

    /**
     * WARM PHASE SERIALIZATION
     */
    if (_meta.warm.enabled) {
      draft.phases.warm!.actions = draft.phases.warm?.actions ?? {};
      const warmPhase = draft.phases.warm!;
      // If warm phase on rollover is enabled, delete min age field
      // An index lifecycle switches to warm phase when rollover occurs, so you cannot specify a warm phase time
      // They are mutually exclusive
      if (
        (!_meta.hot.useRollover || !_meta.warm.warmPhaseOnRollover) &&
        updatedPolicy.phases.warm?.min_age
      ) {
        warmPhase.min_age = `${updatedPolicy.phases.warm!.min_age}${_meta.warm.minAgeUnit}`;
      } else {
        delete warmPhase.min_age;
      }

      warmPhase.actions = serializeMigrateAndAllocateActions(
        _meta.warm,
        warmPhase.actions,
        originalPolicy?.phases.warm?.actions,
        updatedPolicy.phases.warm?.actions?.allocate?.number_of_replicas
      );

      if (!updatedPolicy.phases.warm?.actions?.forcemerge) {
        delete warmPhase.actions.forcemerge;
      } else if (_meta.warm.bestCompression) {
        warmPhase.actions.forcemerge!.index_codec = 'best_compression';
      } else {
        delete warmPhase.actions.forcemerge!.index_codec;
      }

      if (_meta.warm.readonlyEnabled) {
        warmPhase.actions.readonly = warmPhase.actions.readonly ?? {};
      } else {
        delete warmPhase.actions.readonly;
      }

      if (!updatedPolicy.phases.warm?.actions?.set_priority) {
        delete warmPhase.actions.set_priority;
      }

      if (!updatedPolicy.phases.warm?.actions?.shrink) {
        delete warmPhase.actions.shrink;
      }
    } else {
      delete draft.phases.warm;
    }

    /**
     * COLD PHASE SERIALIZATION
     */
    if (_meta.cold.enabled) {
      draft.phases.cold!.actions = draft.phases.cold?.actions ?? {};
      const coldPhase = draft.phases.cold!;

      if (updatedPolicy.phases.cold?.min_age) {
        coldPhase.min_age = `${updatedPolicy.phases.cold!.min_age}${_meta.cold.minAgeUnit}`;
      }

      coldPhase.actions = serializeMigrateAndAllocateActions(
        _meta.cold,
        coldPhase.actions,
        originalPolicy?.phases.cold?.actions,
        updatedPolicy.phases.cold?.actions?.allocate?.number_of_replicas
      );

      if (_meta.cold.freezeEnabled) {
        coldPhase.actions.freeze = coldPhase.actions.freeze ?? {};
      } else {
        delete coldPhase.actions.freeze;
      }

      if (!updatedPolicy.phases.cold?.actions?.set_priority) {
        delete coldPhase.actions.set_priority;
      }

      if (!updatedPolicy.phases.cold?.actions?.searchable_snapshot) {
        delete coldPhase.actions.searchable_snapshot;
      }
    } else {
      delete draft.phases.cold;
    }

    /**
     * DELETE PHASE SERIALIZATION
     */
    if (_meta.delete.enabled) {
      const deletePhase = draft.phases.delete!;
      deletePhase.actions = deletePhase.actions ?? {};
      deletePhase.actions.delete = deletePhase.actions.delete ?? {};
      if (updatedPolicy.phases.delete?.min_age) {
        deletePhase.min_age = `${updatedPolicy.phases.delete!.min_age}${_meta.delete.minAgeUnit}`;
      }

      if (!updatedPolicy.phases.delete?.actions?.wait_for_snapshot) {
        delete deletePhase.actions.wait_for_snapshot;
      }
    } else {
      delete draft.phases.delete;
    }
  });
};
