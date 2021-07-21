/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { CoreStart } from 'kibana/public';
import { PackagePolicyCreateExtensionComponent } from '../../../../fleet/public';

export const getLazyAPMPolicyCreateExtension = (coreStart: CoreStart) => {
  return lazy<PackagePolicyCreateExtensionComponent>(async () => {
    const { CreateAPMPolicyForm } = await import(
      './apm_policy_form/create_apm_policy_form'
    );

    const { createCallApmApi } = await import(
      '../../services/rest/createCallApmApi'
    );

    createCallApmApi(coreStart);

    return { default: CreateAPMPolicyForm };
  });
};
