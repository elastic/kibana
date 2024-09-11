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
      payload: any;
    };

export interface IEditSpaceStoreState {
  /** roles assigned to current space */
  roles: Map<string, Role>;
}

export const createSpaceRolesReducer: Reducer<IEditSpaceStoreState, IDispatchAction> = (
  state,
  action
) => {
  const _state = structuredClone(state);

  switch (action.type) {
    case 'update_roles': {
      if (action.payload) {
        action.payload.forEach((role) => {
          _state.roles.set(role.name, role);
        });
      }

      return _state;
    }
    case 'remove_roles': {
      action.payload.forEach((role) => {
        _state.roles.delete(role.name);
      });

      return _state;
    }
    default: {
      return _state;
    }
  }
};
