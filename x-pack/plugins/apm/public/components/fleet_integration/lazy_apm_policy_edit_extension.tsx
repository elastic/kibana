/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyEditExtensionComponent } from '../../../../fleet/public';

export const getLazyAPMPolicyEditExtension = () => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const { EditAPMPolicyForm } = await import(
      './apm_policy_form/edit_apm_policy_form'
    );

    return { default: EditAPMPolicyForm };
  });
};
