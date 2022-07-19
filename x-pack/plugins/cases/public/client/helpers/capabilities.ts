/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesPermissions } from '../../../common';
import {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  PUSH_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '../../../common/constants';

export const getUICapabilities = (
  featureCapabilities?: Partial<Record<string, boolean | Record<string, boolean>>>
): CasesPermissions => {
  const create = !!featureCapabilities?.[CREATE_CASES_CAPABILITY];
  const read = !!featureCapabilities?.[READ_CASES_CAPABILITY];
  const update = !!featureCapabilities?.[UPDATE_CASES_CAPABILITY];
  const deletePriv = !!featureCapabilities?.[DELETE_CASES_CAPABILITY];
  const push = !!featureCapabilities?.[PUSH_CASES_CAPABILITY];
  const all = create && read && update && deletePriv && push;

  return {
    all,
    create,
    read,
    update,
    delete: deletePriv,
    push,
  };
};
