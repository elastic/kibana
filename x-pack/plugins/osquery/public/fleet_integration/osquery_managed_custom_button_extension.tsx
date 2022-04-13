/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent } from '@elastic/eui';
import React from 'react';

import { PackageCustomExtensionComponentProps } from '../../../fleet/public';
import { NavigationButtons } from './navigation_buttons';
import { DisabledCallout } from './disabled_callout';
import { MissingPrivileges } from '../routes/components/missing_privileges';
import { useFetchStatus } from './use_fetch_status';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app custom tab
 */
export const OsqueryManagedCustomButtonExtension = React.memo<PackageCustomExtensionComponentProps>(
  () => {
    const { loading, disabled, permissionDenied } = useFetchStatus();

    if (loading) {
      return <EuiLoadingContent lines={5} />;
    }

    if (permissionDenied) {
      return <MissingPrivileges />;
    }

    return (
      <>
        {disabled ? <DisabledCallout /> : null}
        <NavigationButtons isDisabled={disabled} />
      </>
    );
  }
);
OsqueryManagedCustomButtonExtension.displayName = 'OsqueryManagedCustomButtonExtension';
