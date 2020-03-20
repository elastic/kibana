/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SyntheticEvent, useCallback, useEffect, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiBasicTable,
  EuiText,
  EuiTableFieldDataColumnType,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { usePageId } from '../use_page_id';
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
import { PolicyData } from '../../types';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { PageView } from '../../components/page_view';

interface TableChangeCallbackArguments {
  page: { index: number; size: number };
}

const PolicyLink: React.FC<{ name: string; route: string }> = ({ name, route }) => {
  const history = useHistory();

  return (
    <EuiLink
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        history.push(route);
      }}
    >
      {name}
    </EuiLink>
  );
};

const renderPolicyNameLink = (value: string, _item: PolicyData) => {
  return <PolicyLink name={value} route={`/policy/${_item.id}`} />;
};

export const PolicyList = React.memo(() => {
  usePageId('policyListPage');

  const { services, notifications } = useKibana();

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
      dispatch({
        type: 'userPaginatedPolicyListTable',
        payload: {
          pageIndex: index,
          pageSize: size,
        },
      });
    },
    [dispatch]
  );

  const columns: Array<EuiTableFieldDataColumnType<PolicyData>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
        render: renderPolicyNameLink,
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
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink
              href={`${services.application.getUrlForApp('ingestManager')}#/configs/${version}`}
              onClick={(ev: SyntheticEvent) => {
                ev.preventDefault();
                services.application.navigateToApp('ingestManager', {
                  path: `#/configs/${version}`,
                });
              }}
            >
              {version}
            </EuiLink>
          );
        },
      },
    ],
    [services.application]
  );

  return (
    <PageView
      headerLeft={i18n.translate('xpack.endpoint.policyList.viewTitle', {
        defaultMessage: 'Policies',
      })}
    >
      <EuiBasicTable
        items={policyItems}
        columns={columns}
        loading={loading}
        pagination={paginationSetup}
        onChange={handleTableChange}
        data-test-subj="policyTable"
      />
    </PageView>
  );

  // return (
  //   <EuiPage data-test-subj="policyListPage">
  //     <EuiPageBody>
  //       <EuiPageContent>
  //         <EuiPageContentHeader>
  //           <EuiPageContentHeaderSection>
  //             <EuiTitle size="l">
  //               <h1 data-test-subj="policyViewTitle">
  //                 <FormattedMessage
  //                   id="xpack.endpoint.policyList.viewTitle"
  //                   defaultMessage="Policies"
  //                 />
  //               </h1>
  //             </EuiTitle>
  //             <h2>
  //               <EuiText color="subdued" data-test-subj="policyTotalCount" size="s">
  //                 <FormattedMessage
  //                   id="xpack.endpoint.policyList.viewTitleTotalCount"
  //                   defaultMessage="{totalItemCount} Policies"
  //                   values={{ totalItemCount }}
  //                 />
  //               </EuiText>
  //             </h2>
  //           </EuiPageContentHeaderSection>
  //         </EuiPageContentHeader>
  //         <EuiPageContentBody>
  //           <EuiBasicTable
  //             items={policyItems}
  //             columns={columns}
  //             loading={loading}
  //             pagination={paginationSetup}
  //             onChange={handleTableChange}
  //             data-test-subj="policyTable"
  //           />
  //         </EuiPageContentBody>
  //       </EuiPageContent>
  //     </EuiPageBody>
  //   </EuiPage>
  // );
});
