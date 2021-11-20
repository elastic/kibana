/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent } from '@elastic/eui';
import React, { useEffect } from 'react';

import { PackageCustomExtensionComponentProps } from '../../../fleet/public';
import { NavigationButtons } from './navigation_buttons';
import { DisabledCallout } from './disabled_callout';
import { useKibana } from '../common/lib/kibana';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app custom tab
 */
export const OsqueryManagedCustomButtonExtension = React.memo<PackageCustomExtensionComponentProps>(
  () => {
    const [disabled, setDisabled] = React.useState<boolean | null>(null);
    const { http } = useKibana().services;

    useEffect(() => {
      const fetchStatus = () => {
        http.get<{ install_status: string }>('/internal/osquery/status').then((response) => {
          setDisabled(response?.install_status !== 'installed');
        });
      };
      fetchStatus();
    }, [http]);

    if (disabled === null) {
      return <EuiLoadingContent lines={5} />;
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
