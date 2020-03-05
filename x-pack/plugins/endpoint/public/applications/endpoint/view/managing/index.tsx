/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiBasicTable,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import * as selectors from '../../store/managing/selectors';
import { ManagementAction } from '../../store/managing/action';
import { useManagementListSelector } from './hooks';
import { usePageId } from '../use_page_id';
import { CreateStructuredSelector } from '../../types';

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const ManagementList = () => {
  usePageId('managementPage');
  const dispatch = useDispatch<(a: ManagementAction) => void>();
  const {
    listData,
    pageIndex,
    pageSize,
    totalHits: totalItemCount,
    isLoading,
  } = useManagementListSelector(selector);

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 20, 50],
      hidePerPageOptions: false,
    };
  }, [pageIndex, pageSize, totalItemCount]);

  const onTableChange = useCallback(
    ({ page }: { page: { index: number; size: number } }) => {
      const { index, size } = page;
      dispatch({
        type: 'userPaginatedManagementList',
        payload: { pageIndex: index, pageSize: size },
      });
    },
    [dispatch]
  );

  const columns = [
    {
      field: 'host.hostname',
      name: i18n.translate('xpack.endpoint.management.list.host', {
        defaultMessage: 'Hostname',
      }),
    },
    {
      field: '',
      name: i18n.translate('xpack.endpoint.management.list.policy', {
        defaultMessage: 'Policy',
      }),
      render: () => {
        return 'Policy Name';
      },
    },
    {
      field: '',
      name: i18n.translate('xpack.endpoint.management.list.policyStatus', {
        defaultMessage: 'Policy Status',
      }),
      render: () => {
        return 'Policy Status';
      },
    },
    {
      field: '',
      name: i18n.translate('xpack.endpoint.management.list.alerts', {
        defaultMessage: 'Alerts',
      }),
      render: () => {
        return '0';
      },
    },
    {
      field: 'host.os.name',
      name: i18n.translate('xpack.endpoint.management.list.os', {
        defaultMessage: 'Operating System',
      }),
    },
    {
      field: 'host.ip',
      name: i18n.translate('xpack.endpoint.management.list.ip', {
        defaultMessage: 'IP Address',
      }),
    },
    {
      field: '',
      name: i18n.translate('xpack.endpoint.management.list.sensorVersion', {
        defaultMessage: 'Sensor Version',
      }),
      render: () => {
        return 'version';
      },
    },
    {
      field: '',
      name: i18n.translate('xpack.endpoint.management.list.lastActive', {
        defaultMessage: 'Last Active',
      }),
      render: () => {
        return 'xxxx';
      },
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2 data-test-subj="managementViewTitle">
                  <FormattedMessage
                    id="xpack.endpoint.managementList.hosts"
                    defaultMessage="Hosts"
                  />
                </h2>
              </EuiTitle>
              <h4>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.endpoint.managementList.totalCount"
                    defaultMessage="{totalItemCount} Hosts"
                    values={{ totalItemCount }}
                  />
                </EuiTextColor>
              </h4>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiBasicTable
              data-test-subj="managementListTable"
              items={listData}
              columns={columns}
              loading={isLoading}
              pagination={paginationSetup}
              onChange={onTableChange}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
