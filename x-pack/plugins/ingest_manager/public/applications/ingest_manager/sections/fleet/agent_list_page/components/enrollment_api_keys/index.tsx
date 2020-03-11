/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiBasicTable, EuiButtonEmpty, EuiSpacer, EuiPopover, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { usePagination, sendRequest } from '../../../../../hooks';
import { useEnrollmentApiKeys, useEnrollmentApiKey } from './hooks';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import { CreateApiKeyForm } from './create_api_key_form';
import { EnrollmentAPIKey } from '../../../../../types';
import { useCore } from '../../../../../hooks';
import { enrollmentAPIKeyRouteService } from '../../../../../services';
export { useEnrollmentApiKeys, useEnrollmentApiKey } from './hooks';

export const EnrollmentApiKeysTable: React.FunctionComponent<{
  onChange: () => void;
}> = ({ onChange }) => {
  const [confirmDeleteApiKeyId, setConfirmDeleteApiKeyId] = useState<string | null>(null);
  const { pagination } = usePagination();
  const { data, isLoading, refresh } = useEnrollmentApiKeys(pagination);

  const columns: any[] = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.apiKeysList.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      width: '300px',
    },
    {
      field: 'config_id',
      name: i18n.translate('xpack.ingestManager.apiKeysList.configColumnTitle', {
        defaultMessage: 'Config',
      }),
      width: '100px',
    },
    {
      field: null,
      name: i18n.translate('xpack.ingestManager.apiKeysList.apiKeyColumnTitle', {
        defaultMessage: 'API Key',
      }),
      render: (key: EnrollmentAPIKey) => <ApiKeyField apiKeyId={key.id} />,
    },
    {
      field: null,
      width: '50px',
      render: (key: EnrollmentAPIKey) => {
        return (
          <EuiButtonEmpty onClick={() => setConfirmDeleteApiKeyId(key.id)} iconType={'trash'} />
        );
      },
    },
  ];

  return (
    <>
      {confirmDeleteApiKeyId && (
        <ConfirmDeleteModal
          apiKeyId={confirmDeleteApiKeyId}
          onCancel={() => setConfirmDeleteApiKeyId(null)}
          onConfirm={async () => {
            await sendRequest({
              method: 'delete',
              path: enrollmentAPIKeyRouteService.getDeletePath(confirmDeleteApiKeyId),
            });
            setConfirmDeleteApiKeyId(null);
            refresh();
          }}
        />
      )}
      <EuiBasicTable
        compressed={true}
        loading={isLoading}
        noItemsMessage={
          <FormattedMessage
            id="xpack.ingestManager.apiKeysList.emptyEnrollmentKeysMessage"
            defaultMessage="No api keys"
          />
        }
        items={data ? data.list : []}
        itemId="id"
        columns={columns}
      />
      <EuiSpacer size={'s'} />
      <CreateApiKeyButton
        onChange={() => {
          refresh();
          onChange();
        }}
      />
    </>
  );
};

export const CreateApiKeyButton: React.FunctionComponent<{ onChange: () => void }> = ({
  onChange,
}) => {
  const core = useCore();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiLink
          disabled={!core.application.capabilities.ingestManager.write}
          onClick={() => setIsOpen(true)}
          color="primary"
        >
          <FormattedMessage
            id="xpack.ingestManager.enrollmentApiKeyList.createNewButton"
            defaultMessage="Create a new key"
          />
        </EuiLink>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <CreateApiKeyForm
        onChange={() => {
          setIsOpen(false);
          onChange();
        }}
      />
    </EuiPopover>
  );
  return <></>;
};

const ApiKeyField: React.FunctionComponent<{ apiKeyId: string }> = ({ apiKeyId }) => {
  const [visible, setVisible] = useState(false);
  const { data } = useEnrollmentApiKey(apiKeyId);

  return (
    <>
      {visible && data ? data.item.api_key : '••••••••••••••••••••••••••••'}
      <EuiButtonEmpty size="xs" color={'text'} onClick={() => setVisible(!visible)}>
        {visible ? (
          <FormattedMessage
            id="xpack.ingestManager.enrollmentApiKeyList.hideTableButton"
            defaultMessage="Hide"
          />
        ) : (
          <FormattedMessage
            id="xpack.ingestManager.enrollmentApiKeyList.viewTableButton"
            defaultMessage="View"
          />
        )}
      </EuiButtonEmpty>{' '}
    </>
  );
};
