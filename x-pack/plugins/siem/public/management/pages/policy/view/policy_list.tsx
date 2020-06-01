/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiText,
  EuiFlexItem,
  EuiTableFieldDataColumnType,
  EuiLink,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { createStructuredSelector } from 'reselect';
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

const PolicyLink: React.FC<{ name: string; route: string; href: string }> = ({
  name,
  route,
  href,
}) => {
  const clickHandler = useNavigateByRouterEventHandler(route);
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={href} onClick={clickHandler} data-test-subj="policyNameLink">
      {name}
    </EuiLink>
  );
};

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const PolicyList = React.memo(() => {
  const { services, notifications } = useKibana();
  const history = useHistory();
  const location = useLocation();

  const dispatch = useDispatch<(action: PolicyListAction) => void>();
  const {
    selectPolicyItems: policyItems,
    selectPageIndex: pageIndex,
    selectPageSize: pageSize,
    selectTotal: totalItemCount,
    selectIsLoading: loading,
    selectApiError: apiError,
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

  const columns: Array<EuiTableFieldDataColumnType<Immutable<PolicyData>>> = useMemo(
    () => [
      {
        field: '',
        name: i18n.translate('xpack.siem.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
        // eslint-disable-next-line react/display-name
        render: (item: Immutable<PolicyData>) => {
          const routePath = getManagementUrl({
            name: 'policyDetails',
            policyId: item.id,
            excludePrefix: true,
          });
          const routeUrl = getManagementUrl({ name: 'policyDetails', policyId: item.id });
          return (
            <>
              <EuiFlexItem grow={false}>
                <PolicyLink name={item.name} route={routePath} href={routeUrl} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  color="subdued"
                  size="xs"
                  style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}
                >
                  <FormattedMessage
                    id="xpack.siem.endpoint.policyList.revision"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: item.revision }}
                  />
                </EuiText>
              </EuiFlexItem>
            </>
          );
        },
        truncateText: true,
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.siem.endpoint.policyList.createdBy', {
          defaultMessage: 'Created By',
        }),
        truncateText: true,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.siem.endpoint.policyList.createdAt', {
          defaultMessage: 'Created Date',
        }),
        render(createdAt: string) {
          return <FormattedDateAndTime date={new Date(createdAt)} />;
        },
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.siem.endpoint.policyList.updatedBy', {
          defaultMessage: 'Last Updated By',
        }),
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.siem.endpoint.policyList.updatedAt', {
          defaultMessage: 'Last Updated',
        }),
        render(updatedAt: string) {
          return <FormattedDateAndTime date={new Date(updatedAt)} />;
        },
      },
      {
        field: 'package',
        name: i18n.translate('xpack.siem.endpoint.policyList.versionField', {
          defaultMessage: 'Version',
        }),
        render(pkg) {
          return `${pkg.title}  v${pkg.version}`;
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
                <EuiContextMenuItem icon="link" key="datasourceEdit">
                  <LinkToApp
                    data-test-subj="agentConfigLink"
                    appId="ingestManager"
                    appPath={`#/configs/${item.config_id}`}
                    href={`${services.application.getUrlForApp('ingestManager')}#/configs/${
                      item.config_id
                    }`}
                  >
                    <FormattedMessage
                      id="xpack.siem.endpoint.policyList.agentConfigAction"
                      defaultMessage="View Agent Config"
                    />
                  </LinkToApp>
                </EuiContextMenuItem>
              );
            },
          },
        ],
      },
    ],
    [services.application]
  );

  return (
    <ManagementPageView
      viewType="list"
      data-test-subj="policyListPage"
      headerLeft={i18n.translate('xpack.siem.endpoint.policyList.viewTitle', {
        defaultMessage: 'Policies',
      })}
      bodyHeader={
        <EuiText color="subdued" data-test-subj="policyTotalCount">
          <FormattedMessage
            id="xpack.siem.endpoint.policyList.viewTitleTotalCount"
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
  );
});

PolicyList.displayName = 'PolicyList';
