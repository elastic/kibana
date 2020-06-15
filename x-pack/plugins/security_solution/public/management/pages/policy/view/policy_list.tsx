/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, CSSProperties, useState } from 'react';
import {
  EuiBasicTable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTableFieldDataColumnType,
  EuiLink,
  EuiPopover,
  EuiContextMenuPanelProps,
  EuiContextMenuItem,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { createStructuredSelector } from 'reselect';
import styled from 'styled-components';
import { CreateStructuredSelector } from '../../../../common/store';
import * as selectors from '../store/policy_list/selectors';
import { usePolicyListSelector } from './policy_hooks';
import { PolicyListAction } from '../store/policy_list';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { Immutable, PolicyData } from '../../../../../common/endpoint/types';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { LinkToApp } from '../../../../common/components/endpoint/link_to_app';
import { ManagementPageView } from '../../../components/management_page_view';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { getManagementUrl } from '../../../common/routing';
import { FormattedDateAndTime } from '../../../../common/components/endpoint/formatted_date_time';

interface TableChangeCallbackArguments {
  page: { index: number; size: number };
}

interface PackageData {
  name: string;
  title: string;
  version: string;
}

const NO_WRAP_TRUNCATE_STYLE: CSSProperties = Object.freeze({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const DangerEuiContextMenuItem = styled(EuiContextMenuItem)`
  color: ${(props) => props.theme.eui.textColors.danger};
`;

// eslint-disable-next-line react/display-name
export const TableRowActions = React.memo<{ items: EuiContextMenuPanelProps['items'] }>(
  ({ items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        data-test-subj="policyActions"
        button={
          <EuiButtonIcon
            data-test-subj="policyActionsButton"
            iconType="boxesHorizontal"
            onClick={handleToggleMenu}
            aria-label={i18n.translate('xpack.securitySolution.endpoint.policyList.actionMenu', {
              defaultMessage: 'Open',
            })}
          />
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel items={items} data-test-subj="policyActionsMenu" />
      </EuiPopover>
    );
  }
);

const PolicyLink: React.FC<{ name: string; route: string; href: string }> = ({
  name,
  route,
  href,
}) => {
  const clickHandler = useNavigateByRouterEventHandler(route);
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      href={href}
      onClick={clickHandler}
      data-test-subj="policyNameLink"
      style={NO_WRAP_TRUNCATE_STYLE}
    >
      {name}
    </EuiLink>
  );
};

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const PolicyList = React.memo(() => {
  const { services, notifications } = useKibana();
  const history = useHistory();
  const location = useLocation();

  const [showDelete, setShowDelete] = useState<boolean>(false);
  const [policyIdToDelete, setPolicyIdToDelete] = useState<string>('');

  const dispatch = useDispatch<(action: PolicyListAction) => void>();
  const {
    selectPolicyItems: policyItems,
    selectPageIndex: pageIndex,
    selectPageSize: pageSize,
    selectTotal: totalItemCount,
    selectIsLoading: loading,
    selectApiError: apiError,
    selectIsDeleting: isDeleting,
    selectDeleteStatus: deleteStatus,
    selectAgentStatusSummary: agentStatusSummary,
  } = usePolicyListSelector(selector);

  useEffect(() => {
    if (apiError) {
      notifications.toasts.danger({
        title: apiError.error,
        body: apiError.message,
        toastLifeTimeMs: 10000,
      });
    }
  }, [apiError, dispatch, notifications.toasts]);

  // Handle showing update statuses
  useEffect(() => {
    if (deleteStatus !== undefined) {
      if (deleteStatus === true) {
        setPolicyIdToDelete('');
        setShowDelete(false);
        notifications.toasts.success({
          toastLifeTimeMs: 10000,
          title: i18n.translate('xpack.securitySolution.endpoint.policyList.deleteSuccessToast', {
            defaultMessage: 'Success!',
          }),
          body: (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.deleteSuccessToastDetails"
              defaultMessage="Policy has been deleted."
            />
          ),
        });
      } else {
        notifications.toasts.danger({
          toastLifeTimeMs: 10000,
          title: i18n.translate('xpack.securitySolution.endpoint.policyList.deleteFailedToast', {
            defaultMessage: 'Failed!',
          }),
          body: i18n.translate('xpack.securitySolution.endpoint.policyList.deleteFailedToastBody', {
            defaultMessage: 'Failed to delete policy',
          }),
        });
      }
    }
  }, [notifications.toasts, deleteStatus]);

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 20, 50],
      hidePerPageOptions: false,
    };
  }, [pageIndex, pageSize, totalItemCount]);

  const handleTableChange = useCallback(
    ({ page: { index, size } }: TableChangeCallbackArguments) => {
      history.push(`${location.pathname}?page_index=${index}&page_size=${size}`);
    },
    [history, location.pathname]
  );

  const handleDeleteOnClick = useCallback(
    ({ policyId, agentConfigId }: { policyId: string; agentConfigId: string }) => {
      dispatch({
        type: 'userOpenedPolicyListDeleteModal',
        payload: {
          agentConfigId,
        },
      });
      setPolicyIdToDelete(policyId);
      setShowDelete(true);
    },
    [dispatch]
  );

  const handleDeleteConfirmation = useCallback(
    ({ policyId }: { policyId: string }) => {
      dispatch({
        type: 'userClickedPolicyListDeleteButton',
        payload: {
          policyId,
        },
      });
    },
    [dispatch]
  );

  const handleDeleteCancel = useCallback(() => {
    setShowDelete(false);
  }, []);

  const columns: Array<EuiTableFieldDataColumnType<Immutable<PolicyData>>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
        // eslint-disable-next-line react/display-name
        render: (name: string, item: Immutable<PolicyData>) => {
          const routePath = getManagementUrl({
            name: 'policyDetails',
            policyId: item.id,
            excludePrefix: true,
          });
          const routeUrl = getManagementUrl({ name: 'policyDetails', policyId: item.id });
          return (
            <EuiFlexGroup gutterSize="s" alignItems="baseline" style={{ minWidth: 0 }}>
              <EuiFlexItem grow={false} style={NO_WRAP_TRUNCATE_STYLE}>
                <PolicyLink name={name} route={routePath} href={routeUrl} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="xs" style={{ whiteSpace: 'nowrap' }}>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policyList.revision"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: item.revision }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.createdBy', {
          defaultMessage: 'Created By',
        }),
        truncateText: true,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.createdAt', {
          defaultMessage: 'Created Date',
        }),
        render(createdAt: string) {
          return <FormattedDateAndTime date={new Date(createdAt)} />;
        },
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.updatedBy', {
          defaultMessage: 'Last Updated By',
        }),
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.updatedAt', {
          defaultMessage: 'Last Updated',
        }),
        render(updatedAt: string) {
          return <FormattedDateAndTime date={new Date(updatedAt)} />;
        },
      },
      {
        field: 'package',
        name: i18n.translate('xpack.securitySolution.endpoint.policyList.versionFieldLabel', {
          defaultMessage: 'Version',
        }),
        render(pkg: Immutable<PackageData>) {
          return i18n.translate('xpack.securitySolution.endpoint.policyList.versionField', {
            defaultMessage: '{title} v{version}',
            values: {
              title: pkg.title,
              version: pkg.version,
            },
          });
        },
      },
      {
        field: '',
        name: 'Actions',
        actions: [
          {
            // eslint-disable-next-line react/display-name
            render: (item: Immutable<PolicyData>) => {
              return (
                <TableRowActions
                  items={[
                    <EuiContextMenuItem icon="link" key="agentConfigLink">
                      <LinkToApp
                        data-test-subj="agentConfigLink"
                        appId="ingestManager"
                        appPath={`#/configs/${item.config_id}`}
                        href={`${services.application.getUrlForApp('ingestManager')}#/configs/${
                          item.config_id
                        }`}
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.policyList.agentConfigAction"
                          defaultMessage="View Agent Configuration"
                        />
                      </LinkToApp>
                    </EuiContextMenuItem>,
                    <DangerEuiContextMenuItem
                      data-test-subj="policyDeleteButton"
                      icon="trash"
                      key="policyDeletAction"
                      onClick={() => {
                        handleDeleteOnClick({ agentConfigId: item.config_id, policyId: item.id });
                      }}
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyList.policyDeleteAction"
                        defaultMessage="Delete Policy"
                      />
                    </DangerEuiContextMenuItem>,
                  ]}
                />
              );
            },
          },
        ],
      },
    ],
    [services.application, handleDeleteOnClick]
  );

  return (
    <>
      {showDelete && (
        <ConfirmDelete
          hostCount={agentStatusSummary ? agentStatusSummary.total : 0}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
          onConfirm={() => {
            handleDeleteConfirmation({ policyId: policyIdToDelete });
          }}
        />
      )}
      <ManagementPageView
        viewType="list"
        data-test-subj="policyListPage"
        headerLeft={i18n.translate('xpack.securitySolution.endpoint.policyList.viewTitle', {
          defaultMessage: 'Policies',
        })}
        bodyHeader={
          <EuiText color="subdued" data-test-subj="policyTotalCount">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.viewTitleTotalCount"
              defaultMessage="{totalItemCount, plural, one {# Policy} other {# Policies}}"
              values={{ totalItemCount }}
            />
          </EuiText>
        }
      >
        <EuiBasicTable
          items={useMemo(() => [...policyItems], [policyItems])}
          columns={columns}
          loading={loading}
          pagination={paginationSetup}
          onChange={handleTableChange}
          data-test-subj="policyTable"
          hasActions={false}
        />
        <SpyRoute />
      </ManagementPageView>
    </>
  );
});

PolicyList.displayName = 'PolicyList';

const ConfirmDelete = React.memo<{
  hostCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ hostCount, isDeleting, onCancel, onConfirm }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        data-test-subj="policyListDeleteModal"
        title={i18n.translate('xpack.securitySolution.endpoint.policyList.deleteConfirm.title', {
          defaultMessage: 'Delete policy and deploy changes',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        buttonColor="danger"
        confirmButtonText={
          isDeleting ? (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.deleteConfirm.deletingButton"
              defaultMessage="Deleting..."
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyList.deleteConfirm.confirmDeleteButton"
              defaultMessage="Delete Policy"
            />
          )
        }
        confirmButtonDisabled={isDeleting}
        cancelButtonText={i18n.translate(
          'xpack.securitySolution.endpoint.policyList.deleteConfirm.cancelButtonTitle',
          {
            defaultMessage: 'Cancel',
          }
        )}
      >
        {hostCount > 0 && (
          <>
            <EuiCallOut
              data-test-subj="policyListWarningCallout"
              color="danger"
              title={i18n.translate(
                'xpack.securitySolution.endpoint.policyList.deleteConfirm.warningTitle',
                {
                  defaultMessage:
                    'This action will delete Endpoint Security from {hostCount, plural, one {# host} other {# hosts}}',
                  values: { hostCount },
                }
              )}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyList.deleteConfirm.warningMessage"
                defaultMessage="Deleting this Policy will remove Endpoint Security from these hosts"
              />
            </EuiCallOut>
            <EuiSpacer size="xl" />
          </>
        )}
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyList.deleteConfirm.message"
            defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
          />
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
});

ConfirmDelete.displayName = 'ConfirmDelete';
