/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { PacksTable } from '../../../packs/packs_table';

const PacksPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const newQueryLinkProps = useRouterNavigate('packs/add');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage id="xpack.osquery.packList.pageTitle" defaultMessage="Packs" />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.packList.pageSubtitle"
                defaultMessage="Create packs to organize sets of queries and to schedule queries for agent policies."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton
        fill
        {...newQueryLinkProps}
        iconType="plusInCircle"
        isDisabled={!permissions.writePacks}
      >
        <FormattedMessage
          id="xpack.osquery.packList.addPackButtonLabel"
          defaultMessage="Add pack"
        />
      </EuiButton>
    ),
    [newQueryLinkProps, permissions.writePacks]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      <PacksTable />
    </WithHeaderLayout>
  );
};

export const PacksPage = React.memo(PacksPageComponent);
