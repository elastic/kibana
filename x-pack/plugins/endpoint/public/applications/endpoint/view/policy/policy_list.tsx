/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiBasicTable, EuiText, EuiTableFieldDataColumnType, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import {
  selectApiError,
  selectIsLoading,
  selectPageIndex,
  selectPageSize,
  selectPolicyItems,
  selectTotal,
} from '../../store/policy_list/selectors';
import { usePolicyListSelector } from './policy_hooks';
import { PolicyListAction } from '../../store/policy_list';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { PageView } from '../components/page_view';
import { LinkToApp } from '../components/link_to_app';
import { Immutable, PolicyData } from '../../../../../common/types';
import { useNavigateByRouterEventHandler } from '../hooks/use_navigate_by_router_event_handler';

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

export const PolicyList = React.memo(() => {
  const { services, notifications } = useKibana();
  const history = useHistory();
  const location = useLocation();

  const dispatch = useDispatch<(action: PolicyListAction) => void>();
  const policyItems = usePolicyListSelector(selectPolicyItems);
  const pageIndex = usePolicyListSelector(selectPageIndex);
  const pageSize = usePolicyListSelector(selectPageSize);
  const totalItemCount = usePolicyListSelector(selectTotal);
  const loading = usePolicyListSelector(selectIsLoading);
  const apiError = usePolicyListSelector(selectApiError);

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
        field: 'name',
        name: i18n.translate('xpack.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
        render: (value: string, item: Immutable<PolicyData>) => {
          const routeUri = `/policy/${item.id}`;
          return (
            <PolicyLink
              name={value}
              route={routeUri}
              href={services.application.getUrlForApp('endpoint') + routeUri}
            />
          );
        },
        truncateText: true,
      },
      {
        field: 'revision',
        name: i18n.translate('xpack.endpoint.policyList.revisionField', {
          defaultMessage: 'Revision',
        }),
        dataType: 'number',
      },
      {
        field: 'package',
        name: i18n.translate('xpack.endpoint.policyList.versionField', {
          defaultMessage: 'Version',
        }),
        render(pkg) {
          return `${pkg.title}  v${pkg.version}`;
        },
      },
      {
        field: 'description',
        name: i18n.translate('xpack.endpoint.policyList.descriptionField', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
      },
      {
        field: 'config_id',
        name: i18n.translate('xpack.endpoint.policyList.agentConfigField', {
          defaultMessage: 'Agent Configuration',
        }),
        render(version: string) {
          return (
            <LinkToApp
              data-test-subj="agentConfigLink"
              appId="ingestManager"
              appPath={`#/configs/${version}`}
              href={`${services.application.getUrlForApp('ingestManager')}#/configs/${version}`}
            >
              {version}
            </LinkToApp>
          );
        },
      },
    ],
    [services.application]
  );

  return (
    <PageView
      viewType="list"
      data-test-subj="policyListPage"
      headerLeft={i18n.translate('xpack.endpoint.policyList.viewTitle', {
        defaultMessage: 'Policies',
      })}
      bodyHeader={
        <EuiText color="subdued" data-test-subj="policyTotalCount">
          <FormattedMessage
            id="xpack.endpoint.policyList.viewTitleTotalCount"
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
      />
    </PageView>
  );
});
