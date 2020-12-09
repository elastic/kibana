/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { SerializedActionWithAllocation } from '../../../../../../common/types';

import { DataAllocationMetaFields } from '../../types';

export const serializeMigrateAndAllocateActions = (
  /**
   * Form metadata about what tier allocation strategy to use and custom node
   * allocation information.
   */
  { dataTierAllocationType, allocationNodeAttribute }: DataAllocationMetaFields,
  /**
   * The new configuration merged with old configuration to ensure we don't lose
   * any fields.
   */
  mergedActions: SerializedActionWithAllocation = {},
  /**
   * The actions from the policy for a given phase when it was loaded.
   */
  originalActions: SerializedActionWithAllocation = {},
  /**
   * The number of replicas value to set in the allocate action.
   */
  numberOfReplicas?: number
): SerializedActionWithAllocation => {
  const { allocate, migrate, ...otherActions } = mergedActions;

  // First copy over all non-allocate and migrate actions.
  const actions: SerializedActionWithAllocation = { ...otherActions };

  // The UI only knows about include, exclude, require and number_of_replicas so copy over all other values.
  if (allocate) {
    const { include, exclude, require, number_of_replicas: __, ...otherSettings } = allocate;
    if (!isEmpty(otherSettings)) {
      actions.allocate = { ...otherSettings };
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
      actions.migrate = {
        ...originalActions?.migrate,
        enabled: false,
      };
      break;
    default:
  }

  if (numberOfReplicas != null) {
    actions.allocate = {
      ...actions.allocate,
      number_of_replicas: numberOfReplicas,
    };
  }

  return actions;
};
