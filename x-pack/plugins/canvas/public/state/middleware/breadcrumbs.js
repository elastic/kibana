/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getWorkpad } from '../selectors/workpad';
import { getBaseBreadcrumb, getWorkpadBreadcrumb, setBreadcrumb } from '../../lib/breadcrumbs';

export const breadcrumbs = ({ getState }) => (next) => (action) => {
  // capture the current workpad
  const currentWorkpad = getWorkpad(getState());

  // execute the default action
  next(action);

  // capture the workpad after the action completes
  const updatedWorkpad = getWorkpad(getState());

  // if the workpad name changed, update the breadcrumb data
  if (currentWorkpad.name !== updatedWorkpad.name) {
    setBreadcrumb([getBaseBreadcrumb(), getWorkpadBreadcrumb(updatedWorkpad)]);
  }
};
