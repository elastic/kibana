/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiPanel,
  EuiEmptyPrompt,
  EuiCallOut,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EntraManagedUser,
  OktaManagedUser,
} from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { ManagedUserDatasetKey } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import * as i18n from './translations';

import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { getManagedUserTableColumns } from './columns';

import type { ManagedUserData } from './types';
import { INSTALL_EA_INTEGRATIONS_HREF, MANAGED_USER_QUERY_ID } from './constants';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useAppUrl } from '../../../../common/lib/kibana';
import { ManagedUserAccordion } from './managed_user_accordion';
import { useManagedUserItems } from './hooks/use_managed_user_items';

export const ManagedUser = ({
  managedUser,
  contextID,
  scopeId,
  isDraggable,
}: {
  managedUser: ManagedUserData;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}) => {
  const entraManagedUser = managedUser.details?.[ManagedUserDatasetKey.ENTRA];
  const oktaManagedUser = managedUser.details?.[ManagedUserDatasetKey.OKTA];
  const { getAppUrl } = useAppUrl();
  const installedIntegrationHref = useMemo(
    () => getAppUrl({ appId: 'integrations', path: INSTALL_EA_INTEGRATIONS_HREF }),
    [getAppUrl]
  );

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          isLoading={managedUser.isLoading}
          initialIsOpen={true}
          id={'managedUser-data'}
          data-test-subj="managedUser-data"
          buttonProps={{
            'data-test-subj': 'managedUser-accordion-button',
          }}
          buttonContent={
            <EuiTitle size="xs">
              <h5>{i18n.MANAGED_DATA_TITLE}</h5>
            </EuiTitle>
          }
          extraAction={
            <InspectButton
              queryId={MANAGED_USER_QUERY_ID}
              title={i18n.MANAGED_USER_INSPECT_TITLE}
            />
          }
        >
          <EuiSpacer size="m" />

          <FormattedMessage
            id="xpack.securitySolution.timeline.userDetails.managed.description"
            defaultMessage="Metadata from any asset repository integrations enabled in your environment."
          />

          <EuiSpacer size="m" />

          {!managedUser.isLoading && !managedUser.isIntegrationEnabled ? (
            <EuiPanel
              data-test-subj="managedUser-integration-disable-callout"
              hasShadow={false}
              hasBorder={true}
            >
              <EuiEmptyPrompt
                title={<h2>{i18n.NO_ACTIVE_INTEGRATION_TITLE}</h2>}
                titleSize="s"
                body={<p>{i18n.NO_ACTIVE_INTEGRATION_TEXT}</p>}
                actions={
                  <EuiButton fill href={installedIntegrationHref}>
                    {i18n.ADD_EXTERNAL_INTEGRATION_BUTTON}
                  </EuiButton>
                }
              />
            </EuiPanel>
          ) : (
            <>
              {!entraManagedUser && !oktaManagedUser && !managedUser.isLoading ? (
                <EuiCallOut
                  data-test-subj="managedUser-no-data"
                  title={i18n.NO_MANAGED_DATA_TITLE}
                  color="warning"
                  iconType="help"
                >
                  <p>{i18n.NO_MANAGED_DATA_TEXT}</p>
                </EuiCallOut>
              ) : (
                <>
                  {entraManagedUser && (
                    <ManagedUserAccordion
                      id="managedUser-entra-data"
                      openTitle={i18n.HIDE_ENTRA_DATA_BUTTON}
                      closedTitle={i18n.SHOW_ENTRA_DATA_BUTTON}
                      managedUser={entraManagedUser}
                    >
                      <ManagedUserDataset
                        isDraggable={isDraggable}
                        contextID={contextID}
                        scopeId={scopeId}
                        managedUser={entraManagedUser}
                      />
                    </ManagedUserAccordion>
                  )}

                  {entraManagedUser && oktaManagedUser && <EuiSpacer size="m" />}

                  {oktaManagedUser && (
                    <ManagedUserAccordion
                      id="managedUser-okta-data"
                      openTitle={i18n.HIDE_OKTA_DATA_BUTTON}
                      closedTitle={i18n.SHOW_OKTA_DATA_BUTTON}
                      managedUser={oktaManagedUser}
                    >
                      <ManagedUserDataset
                        isDraggable={isDraggable}
                        contextID={contextID}
                        scopeId={scopeId}
                        managedUser={oktaManagedUser}
                      />
                    </ManagedUserAccordion>
                  )}
                </>
              )}
            </>
          )}
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};

export const ManagedUserDataset = ({
  managedUser,
  contextID,
  scopeId,
  isDraggable,
}: {
  managedUser: EntraManagedUser | OktaManagedUser;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}) => {
  const managedUserTableColumns = useMemo(
    () => getManagedUserTableColumns(contextID, scopeId, isDraggable),
    [isDraggable, contextID, scopeId]
  );
  const managedItems = useManagedUserItems(managedUser);

  return (
    <BasicTable
      data-test-subj="managedUser-table"
      columns={managedUserTableColumns}
      items={managedItems ?? []}
    />
  );
};
