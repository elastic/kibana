/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { CoreStart } from 'kibana/public';
import { PackagePolicyEditExtensionComponent } from '../../../../fleet/public';

export const getLazyAPMPolicyEditExtension = (coreStart: CoreStart) => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const { APMPolicyForm } = await import('./apm_policy_form');

    const { createCallApmApi } = await import(
      '../../services/rest/createCallApmApi'
    );

    createCallApmApi(coreStart);

    return { default: APMPolicyForm };
  });
};
