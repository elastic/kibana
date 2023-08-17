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
  useEuiTheme,
  EuiEmptyPrompt,
  EuiCallOut,
} from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { getManagedUserTableColumns } from './columns';
import { useManagedUserItems } from './hooks';

import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { ManagedUserData } from './types';
import { INSTALL_INTEGRATION_HREF, MANAGED_USER_QUERY_ID, ONE_WEEK_IN_HOURS } from './constants';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useAppUrl } from '../../../../common/lib/kibana';

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
  const { euiTheme } = useEuiTheme();
  const managedItems = useManagedUserItems(managedUser.details);
  const [isManagedDataToggleOpen, setManagedDataToggleOpen] = useState(false);
  const onToggleManagedData = useCallback(() => {
    setManagedDataToggleOpen((isOpen) => !isOpen);
  }, [setManagedDataToggleOpen]);
  const managedUserTableColumns = useMemo(
    () => getManagedUserTableColumns(contextID, scopeId, isDraggable),
    [isDraggable, contextID, scopeId]
  );
  const { getAppUrl } = useAppUrl();

  const installedIntegrationHref = useMemo(
    () => getAppUrl({ appId: 'integrations', path: INSTALL_INTEGRATION_HREF }),
    [getAppUrl]
  );

  if (!managedUser.isLoading && !managedUser.isIntegrationEnabled) {
    return (
      <>
        <EuiTitle size="s">
          <h5>{i18n.MANAGED_DATA_TITLE}</h5>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiPanel data-test-subj="managedUser-integration-disable-callout">
          <EuiEmptyPrompt
            title={<h2>{i18n.NO_ACTIVE_INTEGRATION_TITLE}</h2>}
            body={<p>{i18n.NO_ACTIVE_INTEGRATION_TEXT}</p>}
            actions={
              <EuiButton fill href={installedIntegrationHref}>
                {i18n.ADD_EXTERNAL_INTEGRATION_BUTTON}
              </EuiButton>
            }
          />
        </EuiPanel>
      </>
    );
  }

  return (
    <>
      <EuiTitle size="s">
        <h5>{i18n.MANAGED_DATA_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="l" />
      <InspectButtonContainer>
        <EuiAccordion
          isLoading={managedUser.isLoading}
          id={'managedUser-data'}
          data-test-subj="managedUser-data"
          forceState={isManagedDataToggleOpen ? 'open' : 'closed'}
          buttonProps={{
            'data-test-subj': 'managedUser-accordion-button',
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          buttonContent={
            isManagedDataToggleOpen ? i18n.HIDE_AZURE_DATA_BUTTON : i18n.SHOW_AZURE_DATA_BUTTON
          }
          onToggle={onToggleManagedData}
          extraAction={
            <>
              <span
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              >
                <InspectButton
                  queryId={MANAGED_USER_QUERY_ID}
                  title={i18n.MANAGED_USER_INSPECT_TITLE}
                />
              </span>
              {managedUser.lastSeen.date && (
                <FormattedMessage
                  id="xpack.securitySolution.timeline.userDetails.updatedTime"
                  defaultMessage="Updated {time}"
                  values={{
                    time: (
                      <FormattedRelativePreferenceDate
                        value={managedUser.lastSeen.date}
                        dateFormat="MMM D, YYYY"
                        relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                      />
                    ),
                  }}
                />
              )}
            </>
          }
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          <EuiPanel color="subdued">
            {managedItems || managedUser.isLoading ? (
              <BasicTable
                loading={managedUser.isLoading}
                data-test-subj="managedUser-table"
                columns={managedUserTableColumns}
                items={managedItems ?? []}
              />
            ) : (
              <>
                <EuiCallOut
                  data-test-subj="managedUser-no-data"
                  title={i18n.NO_AZURE_DATA_TITLE}
                  color="warning"
                  iconType="help"
                >
                  <p>{i18n.NO_AZURE_DATA_TEXT}</p>
                </EuiCallOut>
              </>
            )}
          </EuiPanel>
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
