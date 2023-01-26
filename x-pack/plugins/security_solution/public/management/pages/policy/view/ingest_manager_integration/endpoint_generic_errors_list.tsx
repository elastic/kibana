/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { PackageGenericErrorsListProps } from '@kbn/fleet-plugin/public';
import { EuiSpacer } from '@elastic/eui';

import { useKibana } from '../../../../../common/lib/kibana';
import { PackageActionFormatter } from '../../../../components/package_action_item/package_action_formatter';
import { PackageActionItemError } from '../../../../components/package_action_item/package_action_item_error';

/**
 * Exports Endpoint-generic errors list
 */
export const EndpointGenericErrorsList = memo<PackageGenericErrorsListProps>(
  ({ packageErrors }) => {
    const { docLinks } = useKibana().services;

    const globalEndpointErrors = useMemo(() => {
      const errors: PackageActionFormatter[] = [];
      packageErrors.forEach((unit) => {
        if (unit.status === 'failed') {
          errors.push(
            new PackageActionFormatter(
              unit,
              docLinks.links.securitySolution.packageActionTroubleshooting
            )
          );
        }
      });

      return errors;
    }, [packageErrors, docLinks.links.securitySolution.packageActionTroubleshooting]);

    return (
      <>
        {globalEndpointErrors.map((error) => (
          <React.Fragment key={error.key}>
            <PackageActionItemError actionFormatter={error} />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))}
      </>
    );
  }
);
EndpointGenericErrorsList.displayName = 'EndpointGenericErrorsList';
