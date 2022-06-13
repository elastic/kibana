/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageContent,
  EuiEmptyPrompt,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';
import { APP_RESTORE_INDEX_PRIVILEGES } from '../../../../../common';
import {
  WithPrivileges,
  NotAuthorizedSection,
  PageError,
  PageLoading,
  Error,
  useExecutionContext,
} from '../../../../shared_imports';
import { UIM_RESTORE_LIST_LOAD } from '../../../constants';
import { useLoadRestores } from '../../../services/http';
import { linkToSnapshots } from '../../../services/navigation';
import { useAppContext, useServices } from '../../../app_context';
import { RestoreTable } from './restore_table';

import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';

const ONE_SECOND_MS = 1000;
const TEN_SECONDS_MS = 10 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const INTERVAL_OPTIONS: number[] = [
  TEN_SECONDS_MS,
  THIRTY_SECONDS_MS,
  ONE_MINUTE_MS,
  FIVE_MINUTES_MS,
];
export const RestoreList: React.FunctionComponent = () => {
  // State for tracking interval picker
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<number>(INTERVAL_OPTIONS[1]);

  // Load restores
  const {
    error,
    isLoading,
    data: restores = [],
    isInitialRequest,
    resendRequest,
  } = useLoadRestores(currentInterval);

  const { uiMetricService, history } = useServices();
  const { core } = useAppContext();

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackUiMetric(UIM_RESTORE_LIST_LOAD);
  }, [uiMetricService]);

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'snapshotRestoreRestoreTab',
  });

  let content: JSX.Element;

  if (isInitialRequest) {
    if (isLoading) {
      // Because we're polling for new data, we only want to hide the list during the initial fetch.
      content = (
        <PageLoading>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.loadingRestoresDescription"
            defaultMessage="Loading restores…"
          />
        </PageLoading>
      );
    } else if (error) {
      // If we get an error while polling we don't need to show it to the user because they can still
      // work with the table.
      content = (
        <PageError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.loadingRestoresErrorMessage"
              defaultMessage="Error loading restores"
            />
          }
          error={error as Error}
        />
      );
    }
  } else {
    if (restores && restores.length === 0) {
      content = (
        <EuiPageContent
          hasShadow={false}
          paddingSize="none"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <EuiEmptyPrompt
            iconType="managementApp"
            title={
              <h1>
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreList.emptyPromptTitle"
                  defaultMessage="No restored snapshots"
                />
              </h1>
            }
            body={
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreList.emptyPromptDescription"
                    defaultMessage="Go to {snapshotsLink} to start a restore."
                    values={{
                      snapshotsLink: (
                        <EuiLink {...reactRouterNavigate(history, linkToSnapshots())}>
                          <FormattedMessage
                            id="xpack.snapshotRestore.restoreList.emptyPromptDescriptionLink"
                            defaultMessage="Snapshots"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </Fragment>
            }
            data-test-subj="emptyPrompt"
          />
        </EuiPageContent>
      );
    } else {
      content = (
        <section data-test-subj="restoreList">
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiPopover
                id="srRestoreListIntervalMenu"
                button={
                  <EuiButtonEmpty
                    size="xs"
                    iconType="arrowDown"
                    iconSide="right"
                    onClick={() => setIsIntervalMenuOpen(!isIntervalMenuOpen)}
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreList.intervalMenuButtonText"
                      defaultMessage="Refresh data every {interval}"
                      values={{
                        interval:
                          currentInterval >= ONE_MINUTE_MS ? (
                            <FormattedMessage
                              id="xpack.snapshotRestore.restoreList.intervalMenu.minutesIntervalValue"
                              defaultMessage="{minutes} {minutes, plural, one {minute} other {minutes}}"
                              values={{ minutes: Math.ceil(currentInterval / ONE_MINUTE_MS) }}
                            />
                          ) : (
                            <FormattedMessage
                              id="xpack.snapshotRestore.restoreList.intervalMenu.secondsIntervalValue"
                              defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                              values={{ seconds: Math.ceil(currentInterval / ONE_SECOND_MS) }}
                            />
                          ),
                      }}
                    />
                  </EuiButtonEmpty>
                }
                isOpen={isIntervalMenuOpen}
                closePopover={() => setIsIntervalMenuOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel
                  items={INTERVAL_OPTIONS.map((interval) => (
                    <EuiContextMenuItem
                      key={interval}
                      icon="empty"
                      onClick={() => {
                        resendRequest();
                        setCurrentInterval(interval);
                        setIsIntervalMenuOpen(false);
                      }}
                    >
                      {interval >= ONE_MINUTE_MS ? (
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreList.intervalMenu.minutesIntervalValue"
                          defaultMessage="{minutes} {minutes, plural, one {minute} other {minutes}}"
                          values={{ minutes: Math.ceil(interval / ONE_MINUTE_MS) }}
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreList.intervalMenu.secondsIntervalValue"
                          defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                          values={{ seconds: Math.ceil(interval / ONE_SECOND_MS) }}
                        />
                      )}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isLoading ? <EuiLoadingSpinner size="m" /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <RestoreTable restores={restores} />
        </section>
      );
    }
  }

  return (
    <WithPrivileges privileges={APP_RESTORE_INDEX_PRIVILEGES.map((name) => `index.${name}`)}>
      {({ hasPrivileges, privilegesMissing }) =>
        hasPrivileges ? (
          content
        ) : (
          <NotAuthorizedSection
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.deniedPrivilegeTitle"
                defaultMessage="You're missing index privileges"
              />
            }
            message={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.deniedPrivilegeDescription"
                defaultMessage="To view snapshot restore status, you must have {privilegesCount,
                  plural, one {this index privilege} other {these index privileges}} for one or more indices: {missingPrivileges}."
                values={{
                  missingPrivileges: privilegesMissing.index!.join(', '),
                  privilegesCount: privilegesMissing.index!.length,
                }}
              />
            }
          />
        )
      }
    </WithPrivileges>
  );
};
