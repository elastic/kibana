/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { PacksTable } from '../../../packs/packs_table';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const PacksPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const newQueryLinkProps = useRouterNavigate('packs/add');

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage id="xpack.osquery.packList.pageTitle" defaultMessage="Packs" />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
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
