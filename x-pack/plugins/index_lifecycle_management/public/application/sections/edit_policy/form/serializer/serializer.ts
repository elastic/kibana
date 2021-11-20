/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { merge, cloneDeep } from 'lodash';

import { SerializedPolicy } from '../../../../../../common/types';

import { defaultPolicy, defaultRolloverAction } from '../../../../constants';

import { FormInternal } from '../../types';

import { serializeMigrateAndAllocateActions } from './serialize_migrate_and_allocate_actions';

export const createSerializer =
  (originalPolicy?: SerializedPolicy) =>
  (data: FormInternal): SerializedPolicy => {
    const { _meta, ...updatedPolicy } = data;

    updatedPolicy.phases = { hot: { actions: {} }, ...updatedPolicy.phases };

    return produce<SerializedPolicy>(originalPolicy ?? defaultPolicy, (draft) => {
      // Copy over all updated fields
      merge(draft, updatedPolicy);

      /**
       * Important shared values for serialization
       */
      const isUsingRollover = Boolean(
        _meta.hot?.isUsingDefaultRollover || _meta.hot?.customRollover.enabled
      );

      // Next copy over all meta fields and delete any fields that have been removed
      // by fields exposed in the form. It is very important that we do not delete
      // data that the form does not control! E.g., unfollow action in hot phase.

      /**
       * HOT PHASE SERIALIZATION
       */
      if (draft.phases.hot) {
        draft.phases.hot.min_age = draft.phases.hot.min_age ?? '0ms';

        if (draft.phases.hot?.actions) {
          const hotPhaseActions = draft.phases.hot.actions;

          /**
           * HOT PHASE ROLLOVER
           */
          if (isUsingRollover) {
            if (_meta.hot?.isUsingDefaultRollover) {
              hotPhaseActions.rollover = cloneDeep(defaultRolloverAction);
            } else {
              // Rollover may not exist if editing an existing policy with initially no rollover configured
              if (!hotPhaseActions.rollover) {
                hotPhaseActions.rollover = {};
              }

              // We are using user-defined, custom rollover settings.
              if (updatedPolicy.phases.hot!.actions.rollover?.max_age) {
                hotPhaseActions.rollover.max_age = `${hotPhaseActions.rollover.max_age}${_meta.hot?.customRollover.maxAgeUnit}`;
              } else {
                delete hotPhaseActions.rollover.max_age;
              }

              if (typeof updatedPolicy.phases.hot!.actions.rollover?.max_docs !== 'number') {
                delete hotPhaseActions.rollover.max_docs;
              }

              if (updatedPolicy.phases.hot!.actions.rollover?.max_primary_shard_size) {
                hotPhaseActions.rollover.max_primary_shard_size = `${hotPhaseActions.rollover.max_primary_shard_size}${_meta.hot?.customRollover.maxPrimaryShardSizeUnit}`;
              } else {
                delete hotPhaseActions.rollover.max_primary_shard_size;
              }

              if (updatedPolicy.phases.hot!.actions.rollover?.max_size) {
                hotPhaseActions.rollover.max_size = `${hotPhaseActions.rollover.max_size}${_meta.hot?.customRollover.maxStorageSizeUnit}`;
              } else {
                delete hotPhaseActions.rollover.max_size;
              }
            }

            /**
             * HOT PHASE FORCEMERGE
             */
            if (!updatedPolicy.phases.hot!.actions?.forcemerge) {
              delete hotPhaseActions.forcemerge;
            } else if (_meta.hot?.bestCompression) {
              hotPhaseActions.forcemerge!.index_codec = 'best_compression';
            } else {
              delete hotPhaseActions.forcemerge!.index_codec;
            }

            if (_meta.hot?.bestCompression && hotPhaseActions.forcemerge) {
              hotPhaseActions.forcemerge.index_codec = 'best_compression';
            }

            /**
             * HOT PHASE READ-ONLY
             */
            if (_meta.hot?.readonlyEnabled) {
              hotPhaseActions.readonly = hotPhaseActions.readonly ?? {};
            } else {
              delete hotPhaseActions.readonly;
            }
            /**
             * HOT PHASE SHRINK
             */
            if (!updatedPolicy.phases.hot?.actions?.shrink) {
              delete hotPhaseActions.shrink;
            } else if (_meta.hot.shrink.isUsingShardSize) {
              delete hotPhaseActions.shrink!.number_of_shards;
              hotPhaseActions.shrink!.max_primary_shard_size = `${hotPhaseActions.shrink?.max_primary_shard_size}${_meta.hot?.shrink.maxPrimaryShardSizeUnits}`;
            } else {
              delete hotPhaseActions.shrink!.max_primary_shard_size;
            }
          } else {
            delete hotPhaseActions.rollover;
            delete hotPhaseActions.forcemerge;
            delete hotPhaseActions.readonly;
            delete hotPhaseActions.shrink;
          }
          /**
           * HOT PHASE SET PRIORITY
           */
          if (!updatedPolicy.phases.hot!.actions?.set_priority) {
            delete hotPhaseActions.set_priority;
          }

          /**
           * HOT PHASE SEARCHABLE SNAPSHOT
           */
          if (updatedPolicy.phases.hot!.actions?.searchable_snapshot) {
            hotPhaseActions.searchable_snapshot = {
              ...hotPhaseActions.searchable_snapshot,
              snapshot_repository: _meta.searchableSnapshot.repository,
            };
          } else {
            delete hotPhaseActions.searchable_snapshot;
          }
        }
      }

      /**
       * WARM PHASE SERIALIZATION
       */
      if (_meta.warm.enabled) {
        draft.phases.warm!.actions = draft.phases.warm?.actions ?? {};
        const warmPhase = draft.phases.warm!;

        /**
         * WARM PHASE MIN AGE
         *
         */
        if (updatedPolicy.phases.warm?.min_age) {
          warmPhase.min_age = `${updatedPolicy.phases.warm!.min_age}${_meta.warm.minAgeUnit}`;
        }

        /**
         * WARM PHASE DATA ALLOCATION
         */
        warmPhase.actions = serializeMigrateAndAllocateActions(
          _meta.warm,
          warmPhase.actions,
          originalPolicy?.phases.warm?.actions,
          updatedPolicy.phases.warm?.actions?.allocate?.number_of_replicas
        );

        /**
         * WARM PHASE FORCEMERGE
         */
        if (!updatedPolicy.phases.warm?.actions?.forcemerge) {
          delete warmPhase.actions.forcemerge;
        } else if (_meta.warm.bestCompression) {
          warmPhase.actions.forcemerge!.index_codec = 'best_compression';
        } else {
          delete warmPhase.actions.forcemerge!.index_codec;
        }

        /**
         * WARM PHASE READ ONLY
         */
        if (_meta.warm.readonlyEnabled) {
          warmPhase.actions.readonly = warmPhase.actions.readonly ?? {};
        } else {
          delete warmPhase.actions.readonly;
        }

        /**
         * WARM PHASE SET PRIORITY
         */
        if (!updatedPolicy.phases.warm?.actions?.set_priority) {
          delete warmPhase.actions.set_priority;
        }

        /**
         * WARM PHASE SHRINK
         */
        if (!updatedPolicy.phases.warm?.actions?.shrink) {
          delete warmPhase.actions.shrink;
        } else if (_meta.warm.shrink.isUsingShardSize) {
          delete warmPhase.actions.shrink!.number_of_shards;
          warmPhase.actions.shrink!.max_primary_shard_size = `${warmPhase.actions.shrink?.max_primary_shard_size}${_meta.warm?.shrink.maxPrimaryShardSizeUnits}`;
        } else {
          delete warmPhase.actions.shrink!.max_primary_shard_size;
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

        /**
         * COLD PHASE MIN AGE
         */
        if (updatedPolicy.phases.cold?.min_age) {
          coldPhase.min_age = `${updatedPolicy.phases.cold!.min_age}${_meta.cold.minAgeUnit}`;
        }

        /**
         * COLD PHASE DATA ALLOCATION
         */
        coldPhase.actions = serializeMigrateAndAllocateActions(
          _meta.cold,
          coldPhase.actions,
          originalPolicy?.phases.cold?.actions,
          updatedPolicy.phases.cold?.actions?.allocate?.number_of_replicas
        );

        /**
         * COLD PHASE FREEZE
         * The freeze action has been removed in 8.0.
         * Clean up any policies that still have this action configured
         */
        if (coldPhase.actions.freeze) {
          delete coldPhase.actions.freeze;
        }

        /**
         * COLD PHASE READ ONLY
         */
        if (_meta.cold.readonlyEnabled) {
          coldPhase.actions.readonly = coldPhase.actions.readonly ?? {};
        } else {
          delete coldPhase.actions.readonly;
        }

        /**
         * COLD PHASE SET PRIORITY
         */
        if (!updatedPolicy.phases.cold?.actions?.set_priority) {
          delete coldPhase.actions.set_priority;
        }

        /**
         * COLD PHASE SEARCHABLE SNAPSHOT
         */
        if (updatedPolicy.phases.cold?.actions?.searchable_snapshot) {
          coldPhase.actions.searchable_snapshot = {
            ...coldPhase.actions.searchable_snapshot,
            snapshot_repository: _meta.searchableSnapshot.repository,
          };
        } else {
          delete coldPhase.actions.searchable_snapshot;
        }
      } else {
        delete draft.phases.cold;
      }

      /**
       * FROZEN PHASE SERIALIZATION
       */
      if (_meta.frozen?.enabled) {
        draft.phases.frozen!.actions = draft.phases.frozen?.actions ?? {};
        const frozenPhase = draft.phases.frozen!;

        /**
         * FROZEN PHASE MIN AGE
         */
        if (updatedPolicy.phases.frozen?.min_age) {
          frozenPhase.min_age = `${updatedPolicy.phases.frozen!.min_age}${_meta.frozen.minAgeUnit}`;
        }

        /**
         * FROZEN PHASE SEARCHABLE SNAPSHOT
         */
        if (updatedPolicy.phases.frozen?.actions?.searchable_snapshot) {
          frozenPhase.actions.searchable_snapshot = {
            ...frozenPhase.actions.searchable_snapshot,
            snapshot_repository: _meta.searchableSnapshot.repository,
          };
        } else {
          delete frozenPhase.actions.searchable_snapshot;
        }
      } else {
        delete draft.phases.frozen;
      }

      /**
       * DELETE PHASE SERIALIZATION
       */
      if (_meta.delete.enabled) {
        const deletePhase = draft.phases.delete!;

        /**
         * DELETE PHASE DELETE
         */
        deletePhase.actions = deletePhase.actions ?? {};
        deletePhase.actions.delete = deletePhase.actions.delete ?? {};

        /**
         * DELETE PHASE MIN AGE
         */
        if (updatedPolicy.phases.delete?.min_age) {
          deletePhase.min_age = `${updatedPolicy.phases.delete!.min_age}${_meta.delete.minAgeUnit}`;
        }

        /**
         * DELETE PHASE WAIT FOR SNAPSHOT
         */
        if (!updatedPolicy.phases.delete?.actions?.wait_for_snapshot) {
          delete deletePhase.actions.wait_for_snapshot;
        }
      } else {
        delete draft.phases.delete;
      }
    });
  };
