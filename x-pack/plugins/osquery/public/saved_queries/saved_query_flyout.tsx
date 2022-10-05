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
import { FormProvider } from 'react-hook-form';

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SavedQuerySOFormData, SavedQueryFormData } from './form/use_saved_query_form';
import { useSavedQueryForm } from './form/use_saved_query_form';
import { SavedQueryForm } from './form';
import { useCreateSavedQuery } from './use_create_saved_query';

interface AddQueryFlyoutProps {
  defaultValue: SavedQuerySOFormData;
  onClose: () => void;
  isExternal?: boolean;
}

const additionalZIndexStyle = { style: 'z-index: 6000' };

const SavedQueryFlyoutComponent: React.FC<AddQueryFlyoutProps> = ({
  defaultValue,
  onClose,
  isExternal,
}) => {
  const createSavedQueryMutation = useCreateSavedQuery({ withRedirect: false });

  const hooksForm = useSavedQueryForm({
    defaultValue,
  });
  const {
    serializer,
    idSet,
    handleSubmit,
    formState: { isSubmitting },
  } = hooksForm;
  const onSubmit = useCallback(
    async (payload: SavedQueryFormData) => {
      const serializedData = serializer(payload);
      await createSavedQueryMutation.mutateAsync(serializedData).then(() => onClose());
    },
    [createSavedQueryMutation, onClose, serializer]
  );

  return (
    <EuiPortal>
      <EuiFlyout
        size="m"
        ownFocus
        onClose={onClose}
        aria-labelledby="flyoutTitle"
        maskProps={isExternal ? additionalZIndexStyle : undefined} // For an edge case to display above the alerts flyout
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
          <FormProvider {...hooksForm}>
            <SavedQueryForm idSet={idSet} />
          </FormProvider>
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
              <EuiButton isLoading={isSubmitting} onClick={handleSubmit(onSubmit)} fill>
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
