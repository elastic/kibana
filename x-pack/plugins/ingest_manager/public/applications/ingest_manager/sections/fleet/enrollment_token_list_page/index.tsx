/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { CSSProperties } from 'styled-components';
import {
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  useBreadcrumbs,
  usePagination,
  useGetEnrollmentAPIKeys,
  useGetAgentConfigs,
  sendGetOneEnrollmentAPIKey,
  useCore,
  sendDeleteOneEnrollmentAPIKey,
} from '../../../hooks';
import { EnrollmentAPIKey } from '../../../types';
import { SearchBar } from '../../../components/search_bar';
import { NewEnrollmentTokenFlyout } from './components/new_enrollment_key_flyout';
import { ConfirmEnrollmentTokenDelete } from './components/confirm_delete_modal';

const NO_WRAP_TRUNCATE_STYLE: CSSProperties = Object.freeze({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const ApiKeyField: React.FunctionComponent<{ apiKeyId: string }> = ({ apiKeyId }) => {
  const { notifications } = useCore();
  const [state, setState] = useState<'VISIBLE' | 'HIDDEN' | 'LOADING'>('HIDDEN');
  const [key, setKey] = useState<string | undefined>();

  const toggleKey = async () => {
    if (state === 'VISIBLE') {
      setState('HIDDEN');
    } else if (state === 'HIDDEN') {
      try {
        setState('LOADING');
        const res = await sendGetOneEnrollmentAPIKey(apiKeyId);
        if (res.error) {
          throw res.error;
        }
        setKey(res.data?.item.api_key);
        setState('VISIBLE');
      } catch (err) {
        notifications.toasts.addError(err as Error, {
          title: 'Error',
        });
        setState('HIDDEN');
      }
    }
  };

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="none">
      <EuiFlexItem grow={false}>
        {state === 'VISIBLE' ? (
          <EuiText color="subdued" size="xs">
            {key}
          </EuiText>
        ) : (
          <EuiText color="subdued">•••••••••••••••••••••</EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          color="text"
          isLoading={state === 'LOADING'}
          onClick={toggleKey}
          iconType={state === 'VISIBLE' ? 'eyeClosed' : 'eye'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const DeleteButton: React.FunctionComponent<{ apiKey: EnrollmentAPIKey; refresh: () => void }> = ({
  apiKey,
  refresh,
}) => {
  const { notifications } = useCore();
  const [state, setState] = useState<'CONFIRM_VISIBLE' | 'CONFIRM_HIDDEN'>('CONFIRM_HIDDEN');

  const onCancel = () => setState('CONFIRM_HIDDEN');
  const onConfirm = async () => {
    try {
      const res = await sendDeleteOneEnrollmentAPIKey(apiKey.id);
      if (res.error) {
        throw res.error;
      }
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Error',
      });
    }
    setState('CONFIRM_HIDDEN');
    refresh();
  };
  return (
    <>
      {state === 'CONFIRM_VISIBLE' && (
        <ConfirmEnrollmentTokenDelete
          enrollmentKey={apiKey}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
      <EuiButtonEmpty onClick={() => setState('CONFIRM_VISIBLE')} iconType="trash" color="danger" />
    </>
  );
};

export const EnrollmentTokenListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('fleet_enrollment_tokens');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { pagination, setPagination, pageSizeOptions } = usePagination();

  const enrollmentAPIKeysRequest = useGetEnrollmentAPIKeys({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: search.trim() !== '' ? search : undefined,
  });
  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });

  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  const total = enrollmentAPIKeysRequest?.data?.total ?? 0;
  const items = enrollmentAPIKeysRequest?.data?.list ?? [];

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.nameTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      textOnly: true,
      render: (name: string) => {
        return (
          <EuiText size="s" style={NO_WRAP_TRUNCATE_STYLE} title={name}>
            {name}
          </EuiText>
        );
      },
    },
    {
      field: 'id',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.secretTitle', {
        defaultMessage: 'Secret',
      }),
      width: '215px',
      render: (apiKeyId: string) => {
        return <ApiKeyField apiKeyId={apiKeyId} />;
      },
    },
    {
      field: 'config_id',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.configTitle', {
        defaultMessage: 'Agent config',
      }),
      render: (configId: string) => {
        const config = agentConfigs.find((c) => c.id === configId);
        return <>{config ? config.name : configId}</>;
      },
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.createdAtTitle', {
        defaultMessage: 'Created on',
      }),
      width: '150px',
      render: (createdAt: string) => {
        return createdAt ? (
          <FormattedDate year="numeric" month="short" day="2-digit" value={createdAt} />
        ) : null;
      },
    },
    {
      field: 'active',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.activeTitle', {
        defaultMessage: 'Active',
      }),
      width: '70px',
      render: (active: boolean) => {
        return (
          <EuiText textAlign="center">
            <EuiIcon size="m" color={active ? 'success' : 'danger'} type="dot" />
          </EuiText>
        );
      },
    },
    {
      field: 'actions',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.actionsTitle', {
        defaultMessage: 'Actions',
      }),
      width: '70px',
      render: (_: any, apiKey: EnrollmentAPIKey) => {
        return (
          apiKey.active && (
            <DeleteButton apiKey={apiKey} refresh={() => enrollmentAPIKeysRequest.sendRequest()} />
          )
        );
      },
    },
  ];

  return (
    <>
      {flyoutOpen && (
        <NewEnrollmentTokenFlyout
          agentConfigs={agentConfigs}
          onClose={() => {
            setFlyoutOpen(false);
            enrollmentAPIKeysRequest.sendRequest();
          }}
        />
      )}
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.ingestManager.enrollmentTokensList.pageDescription"
          defaultMessage="This is a list of enrollment tokens that are available to enroll your agents."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem>
          <SearchBar
            value={search}
            onChange={(newSearch) => {
              setPagination({
                ...pagination,
                currentPage: 1,
              });
              setSearch(newSearch);
            }}
            fieldPrefix={ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="plusInCircle" onClick={() => setFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.ingestManager.enrollmentTokensList.newKeyButton"
              defaultMessage="New enrollment token"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<EnrollmentAPIKey>
        loading={enrollmentAPIKeysRequest.isLoading && enrollmentAPIKeysRequest.isInitialRequest}
        hasActions={true}
        noItemsMessage={
          enrollmentAPIKeysRequest.isLoading && enrollmentAPIKeysRequest.isInitialRequest ? (
            <FormattedMessage
              id="xpack.ingestManager.enrollemntAPIKeyList.loadingTokensMessage"
              defaultMessage="Loading enrollment tokens..."
            />
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.enrollemntAPIKeyList.emptyMessage"
              defaultMessage="No enrollment tokens found."
            />
          )
        }
        items={total ? items : []}
        itemId="id"
        columns={columns}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: total,
          pageSizeOptions,
        }}
        onChange={({ page }: { page: { index: number; size: number } }) => {
          const newPagination = {
            ...pagination,
            currentPage: page.index + 1,
            pageSize: page.size,
          };
          setPagination(newPagination);
        }}
      />
    </>
  );
};
