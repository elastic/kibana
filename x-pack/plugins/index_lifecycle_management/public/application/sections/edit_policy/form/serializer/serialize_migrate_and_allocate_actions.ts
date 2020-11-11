/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { SerializedActionWithAllocation } from '../../../../../../common/types';

import { DataAllocationMetaFields } from '../../types';

export const serializeMigrateAndAllocateActions = (
  { dataTierAllocationType, allocationNodeAttribute }: DataAllocationMetaFields,
  newActions: SerializedActionWithAllocation = {},
  originalActions: SerializedActionWithAllocation = {}
): SerializedActionWithAllocation => {
  const { allocate, migrate, ...otherActions } = newActions;

  // First copy over all non-allocate and migrate actions.
  const actions: SerializedActionWithAllocation = { ...otherActions };

  // The UI only knows about include, exclude and require, so copy over all other values.
  if (allocate) {
    const { include, exclude, require, ...otherSettings } = allocate;
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
      actions.migrate = { enabled: false };
      break;
    default:
  }
  return actions;
};
