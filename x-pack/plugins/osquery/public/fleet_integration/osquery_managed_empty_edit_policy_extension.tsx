/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PackagePolicyEditExtensionComponentProps } from '../../../fleet/public';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app edit package policy
 */
const OsqueryManagedEmptyEditPolicyExtensionComponent = () => <></>;

OsqueryManagedEmptyEditPolicyExtensionComponent.displayName =
  'OsqueryManagedEmptyEditPolicyExtension';

export const OsqueryManagedEmptyEditPolicyExtension = React.memo<PackagePolicyEditExtensionComponentProps>(
  OsqueryManagedEmptyEditPolicyExtensionComponent
);
