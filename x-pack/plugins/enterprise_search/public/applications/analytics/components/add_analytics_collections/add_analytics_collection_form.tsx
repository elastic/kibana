/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFormRow, EuiFieldText, EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';

interface AddAnalyticsCollectionForm {
  collectionNameField: string;
  formId: string;
}

export const AddAnalyticsCollectionForm: React.FC<AddAnalyticsCollectionForm> = ({
  formId,
  collectionNameField,
}) => {
  const { createAnalyticsCollection, setNameValue } = useActions(AddAnalyticsCollectionLogic);
  const { name, isLoading, canSubmit, inputError } = useValues(AddAnalyticsCollectionLogic);

  return (
    <EuiForm
      id={formId}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) {
          createAnalyticsCollection();
        }
      }}
    >
      <EuiFormRow
        label={i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.label', {
          defaultMessage: 'Collection name',
        })}
        isInvalid={!!inputError}
        error={inputError}
      >
        <EuiFieldText
          name={collectionNameField}
          fullWidth
          autoFocus
          value={name}
          isLoading={isLoading}
          isInvalid={!!inputError}
          onChange={(e) => {
            setNameValue(e.target.value);
          }}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
