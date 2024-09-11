/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Reducer } from 'react';

import type { Role } from '@kbn/security-plugin-types-common';

export type IDispatchAction =
  | {
      /** @description  updates a single role record */
      type: 'update_roles' | 'remove_roles';
      payload: Role[];
    }
  | {
      type: 'string';
      payload: unknown;
    };

export interface IEditSpaceStoreState {
  /** roles assigned to current space */
  roles: Map<string, Role>;
}

export const createSpaceRolesReducer: Reducer<IEditSpaceStoreState, IDispatchAction> = (
  state,
  action
) => {
  const clonedState = structuredClone(state);

  switch (action.type) {
    case 'update_roles': {
      if (action.payload) {
        action.payload.forEach((role) => {
          clonedState.roles.set(role.name, role);
        });
      }

      return clonedState;
    }
    case 'remove_roles': {
      action.payload.forEach((role) => {
        clonedState.roles.delete(role.name);
      });

      return clonedState;
    }
    default: {
      return clonedState;
    }
  }
};
