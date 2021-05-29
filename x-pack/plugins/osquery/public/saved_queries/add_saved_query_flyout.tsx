/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiPortal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../common/lib/kibana';
import { Form } from '../shared_imports';
import { useSavedQueryForm } from './form/use_saved_query_form';
import { SavedQueryForm } from './form';

interface AddQueryFlyoutProps {
  defaultValue: any;
  onClose: () => void;
  onSave?: () => void;
}

const SaveQueryFlyoutComponent: React.FC<AddQueryFlyoutProps> = ({
  defaultValue,
  onSave,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const createSavedQueryMutation = useMutation(
    (payload) => http.post(`/internal/osquery/saved_query`, { body: JSON.stringify(payload) }),
    {
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
      onSuccess: (payload) => {
        queryClient.invalidateQueries('savedQueryList');
        toasts.addSuccess(
          i18n.translate('xpack.osquery.newSavedQuery.successToastMessageText', {
            defaultMessage: 'Successfully saved "{savedQueryName}" query',
            values: {
              savedQueryName: payload.attributes?.name ?? '',
            },
          })
        );

        if (onSave) {
          onSave();
        }

        onClose();
      },
    }
  );

  const { form } = useSavedQueryForm({
    defaultValue,
    handleSubmit: createSavedQueryMutation.mutateAsync,
  });

  return (
    <EuiPortal>
      <EuiFlyout size="m" ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.osquery.savedQuery.saveQueryFlyoutForm.addFormTitle"
                defaultMessage="Save query"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Form form={form}>
            <SavedQueryForm />
          </Form>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={form.submit} fill>
                <FormattedMessage
                  id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};

export const SaveQueryFlyout = React.memo(SaveQueryFlyoutComponent);
