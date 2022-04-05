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
import React, { useCallback, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { Form } from '../shared_imports';
import { useSavedQueryForm } from './form/use_saved_query_form';
import { SavedQueryForm, SavedQueryFormRefObject } from './form';
import { useCreateSavedQuery } from './use_create_saved_query';

interface AddQueryFlyoutProps {
  defaultValue: unknown;
  onClose: () => void;
}

const SavedQueryFlyoutComponent: React.FC<AddQueryFlyoutProps> = ({ defaultValue, onClose }) => {
  const savedQueryFormRef = useRef<SavedQueryFormRefObject>(null);
  const createSavedQueryMutation = useCreateSavedQuery({ withRedirect: false });

  const handleSubmit = useCallback(
    (payload) => createSavedQueryMutation.mutateAsync(payload).then(() => onClose()),
    [createSavedQueryMutation, onClose]
  );

  const { form } = useSavedQueryForm({
    defaultValue,
    savedQueryFormRef,
    handleSubmit,
  });
  const { submit, isSubmitting } = form;

  return (
    <EuiPortal>
      <EuiFlyout
        size="m"
        ownFocus
        onClose={onClose}
        aria-labelledby="flyoutTitle"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        maskProps={{ style: 'z-index: 6000' }} // For an edge case to display above the alerts flyout
      >
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
            <SavedQueryForm ref={savedQueryFormRef} />
          </Form>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.osquery.pack.queryFlyoutForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton isLoading={isSubmitting} onClick={submit} fill>
                <FormattedMessage
                  id="xpack.osquery.pack.queryFlyoutForm.saveButtonLabel"
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

export const SavedQueryFlyout = React.memo(SavedQueryFlyoutComponent);
