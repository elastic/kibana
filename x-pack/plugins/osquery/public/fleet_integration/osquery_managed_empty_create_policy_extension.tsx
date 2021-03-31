/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { produce } from 'immer';
import deepEqual from 'fast-deep-equal';

import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
const OsqueryManagedEmptyCreatePolicyExtensionComponent: React.FC<PackagePolicyCreateExtensionComponentProps> = ({
  onChange,
  newPolicy,
}) => {
  useEffect(() => {
    const updatedPolicy = produce(newPolicy, (draft) => {
      draft.inputs.forEach((input) => (input.streams = []));
    });

    onChange({
      isValid: true,
      updatedPolicy,
    });
  });

  return <></>;
};

OsqueryManagedEmptyCreatePolicyExtensionComponent.displayName =
  'OsqueryManagedEmptyCreatePolicyExtension';

export const OsqueryManagedEmptyCreatePolicyExtension = React.memo(
  OsqueryManagedEmptyCreatePolicyExtensionComponent,
  // we don't want to update the component if onChange has changed
  (prevProps, nextProps) => deepEqual(prevProps.newPolicy, nextProps.newPolicy)
);
