/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonIcon,
  EuiToolTip,
  EuiIcon,
  EuiText,
  HorizontalAlignment,
} from '@elastic/eui';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  useBreadcrumbs,
  usePagination,
  useGetEnrollmentAPIKeys,
  useGetAgentPolicies,
  sendGetOneEnrollmentAPIKey,
  useCore,
  sendDeleteOneEnrollmentAPIKey,
} from '../../../hooks';
import { EnrollmentAPIKey } from '../../../types';
import { SearchBar } from '../../../components/search_bar';
import { NewEnrollmentTokenFlyout } from './components/new_enrollment_key_flyout';
import { ConfirmEnrollmentTokenDelete } from './components/confirm_delete_modal';

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
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {state === 'VISIBLE'
            ? key
            : '•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            state === 'VISIBLE'
              ? i18n.translate('xpack.ingestManager.enrollmentTokensList.hideTokenButtonLabel', {
                  defaultMessage: 'Hide token',
                })
              : i18n.translate('xpack.ingestManager.enrollmentTokensList.showTokenButtonLabel', {
                  defaultMessage: 'Show token',
                })
          }
        >
          <EuiButtonIcon
            aria-label={
              state === 'VISIBLE'
                ? i18n.translate('xpack.ingestManager.enrollmentTokensList.hideTokenButtonLabel', {
                    defaultMessage: 'Hide token',
                  })
                : i18n.translate('xpack.ingestManager.enrollmentTokensList.showTokenButtonLabel', {
                    defaultMessage: 'Show token',
                  })
            }
            color="text"
            isDisabled={state === 'LOADING'}
            onClick={toggleKey}
            iconType={state === 'VISIBLE' ? 'eyeClosed' : 'eye'}
          />
        </EuiToolTip>
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
      <EuiToolTip
        content={i18n.translate('xpack.ingestManager.enrollmentTokensList.revokeTokenButtonLabel', {
          defaultMessage: 'Revoke token',
        })}
      >
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.ingestManager.enrollmentTokensList.revokeTokenButtonLabel',
            {
              defaultMessage: 'Revoke token',
            }
          )}
          onClick={() => setState('CONFIRM_VISIBLE')}
          iconType="trash"
          color="danger"
        />
      </EuiToolTip>
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
  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });

  const agentPolicies = agentPoliciesRequest.data ? agentPoliciesRequest.data.items : [];

  const total = enrollmentAPIKeysRequest?.data?.total ?? 0;
  const items = enrollmentAPIKeysRequest?.data?.list ?? [];

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.nameTitle', {
        defaultMessage: 'Name',
      }),
      render: (value: string) => (
        <span className="eui-textTruncate" title={value}>
          {value}
        </span>
      ),
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
      field: 'policy_id',
      name: i18n.translate('xpack.ingestManager.enrollmentTokensList.policyTitle', {
        defaultMessage: 'Agent policy',
      }),
      render: (policyId: string) => {
        const agentPolicy = agentPolicies.find((c) => c.id === policyId);
        const value = agentPolicy ? agentPolicy.name : policyId;
        return (
          <span className="eui-textTruncate" title={value}>
            {value}
          </span>
        );
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
      align: 'center' as HorizontalAlignment,
      render: (active: boolean) => {
        return <EuiIcon size="m" color={active ? 'success' : 'danger'} type="dot" />;
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
          agentPolicies={agentPolicies}
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
      <EuiFlexGroup alignItems="center">
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
