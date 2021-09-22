/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { usePack } from '../../../packs/use_pack';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { BetaBadge, BetaBadgeRowWrapper } from '../../../components/beta_badge';

const EditPackPageComponent = () => {
  const { packId } = useParams<{ packId: string }>();
  const queryDetailsLinkProps = useRouterNavigate(`packs/${packId}`);

  const { data } = usePack({ packId });

  useBreadcrumbs('pack_edit', { packName: data?.name ?? '' });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...queryDetailsLinkProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editPack.viewPacksListTitle"
              defaultMessage="View {packName} details"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ packName: data?.name }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <BetaBadgeRowWrapper>
            <h1>
              <FormattedMessage
                id="xpack.osquery.editPack.pageTitle"
                defaultMessage="Edit {packName}"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  packName: data?.name,
                }}
              />
            </h1>
            <BetaBadge />
          </BetaBadgeRowWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [data?.name, queryDetailsLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {!data ? <EuiLoadingContent lines={10} /> : <PackForm editMode={true} defaultValue={data} />}
    </WithHeaderLayout>
  );
};

export const EditPackPage = React.memo(EditPackPageComponent);
