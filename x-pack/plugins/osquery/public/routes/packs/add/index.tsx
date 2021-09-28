/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startCase } from 'lodash';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { useOsqueryIntegrationStatus } from '../../../common/hooks';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const AddPackPageComponent = () => {
  useBreadcrumbs('pack_add');
  const packListProps = useRouterNavigate('packs');
  const { data: osqueryIntegration } = useOsqueryIntegrationStatus();

  const packageInfo = useMemo(() => {
    if (!osqueryIntegration) return;

    return {
      name: osqueryIntegration.name,
      title: osqueryIntegration.title ?? startCase(osqueryIntegration.name),
      version: osqueryIntegration.version,
    };
  }, [osqueryIntegration]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...packListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.addPack.viewPacksListTitle"
              defaultMessage="View all packs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage id="xpack.osquery.addPack.pageTitle" defaultMessage="Add pack" />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [packListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {packageInfo && <PackForm packageInfo={packageInfo} />}
    </WithHeaderLayout>
  );
};

export const AddPackPage = React.memo(AddPackPageComponent);
