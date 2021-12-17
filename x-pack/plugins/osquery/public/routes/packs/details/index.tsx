/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { usePack } from '../../../packs/use_pack';
import { PackQueriesStatusTable } from '../../../packs/pack_queries_status_table';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useAgentPolicyAgentIds } from '../../../agents/use_agent_policy_agent_ids';
import { AgentPoliciesPopover } from '../../../packs/packs_table';

const Divider = styled.div`
  width: 0;
  height: 100%;
  border-left: ${({ theme }) => theme.eui.euiBorderThin};
`;

const PackDetailsPageComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { packId } = useParams<{ packId: string }>();
  const packsListProps = useRouterNavigate('packs');
  const editQueryLinkProps = useRouterNavigate(`packs/${packId}/edit`);

  const { data } = usePack({ packId });
  const { data: agentIds } = useAgentPolicyAgentIds({
    agentPolicyId: data?.policy_id,
    skip: !data,
  });

  useBreadcrumbs('pack_details', { packName: data?.name ?? '' });

  const queriesArray = useMemo(
    () =>
      // @ts-expect-error update types
      (data?.queries && Object.entries(data.queries).map(([id, query]) => ({ ...query, id }))) ??
      [],
    [data]
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...packsListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.packDetails.viewAllPackListTitle"
              defaultMessage="View all packs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.packDetails.pageTitle"
                defaultMessage="{queryName} details"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queryName: data?.name,
                }}
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        {data?.description && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {data.description}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [data?.description, data?.name, packsListProps]
  );

  const RightColumn = useMemo(
    () => (
      <EuiFlexGroup justifyContent="flexEnd" direction="row">
        <EuiFlexItem grow={false} key="agents_failed_count">
          {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop */}
          <EuiDescriptionList compressed textStyle="reverse" style={{ textAlign: 'right' }}>
            <EuiDescriptionListTitle className="eui-textNoWrap">
              <FormattedMessage
                id="xpack.osquery.packDetailsPage.kpis.policiesLabelText"
                defaultMessage="Policies"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription className="eui-textNoWrap">
              {
                // @ts-expect-error update types
                <AgentPoliciesPopover agentPolicyIds={data?.policy_ids} />
              }
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="agents_failed_count_divider">
          <Divider />
        </EuiFlexItem>
        <EuiFlexItem grow={false} key="edit_button">
          <EuiButton
            fill
            {...editQueryLinkProps}
            iconType="pencil"
            isDisabled={!permissions.writePacks}
          >
            <FormattedMessage
              id="xpack.osquery.packDetailsPage.editQueryButtonLabel"
              defaultMessage="Edit"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    // @ts-expect-error update types
    [data?.policy_ids, editQueryLinkProps, permissions]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {data && (
        <PackQueriesStatusTable agentIds={agentIds} packName={data.name} data={queriesArray} />
      )}
    </WithHeaderLayout>
  );
};

export const PackDetailsPage = React.memo(PackDetailsPageComponent);
