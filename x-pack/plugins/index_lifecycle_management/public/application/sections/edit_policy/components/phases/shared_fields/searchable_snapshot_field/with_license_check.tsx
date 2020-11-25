/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { useEditPolicyContext } from '../../../../edit_policy_context';

export const withLicenseCheck = <P,>(Component: FunctionComponent<P>): FunctionComponent<P> => (
  props
) => {
  const { license } = useEditPolicyContext();
  return license.canUseSearchableSnapshot() ? <Component {...props} /> : null;
};
