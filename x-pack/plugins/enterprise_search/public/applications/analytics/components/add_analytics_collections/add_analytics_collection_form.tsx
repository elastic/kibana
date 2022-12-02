/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFieldText,
  EuiForm,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { ROOT_PATH } from '../../routes';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';

export const AddAnalyticsCollectionForm = () => {
  const { createAnalyticsCollection, setNameValue } = useActions(AddAnalyticsCollectionLogic);
  const { name, isLoading, canSubmit } = useValues(AddAnalyticsCollectionLogic);
  const { navigateToUrl } = useValues(KibanaLogic);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} paddingSize="xl" grow={false} hasBorder>
          <EuiTitle>
            <h2>
              {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.title', {
                defaultMessage: 'Create an analytics collection',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.subtitle', {
                defaultMessage:
                  'An analytics collection provides a place to store the analytics events for any given search application you are building. Give it a memorable name below.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiForm
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) {
                createAnalyticsCollection();
              }
            }}
          >
            <EuiFormRow label="Name">
              <EuiFieldText
                name="collection-name"
                fullWidth
                autoFocus
                value={name}
                onChange={(e) => {
                  setNameValue(e.target.value);
                }}
              />
            </EuiFormRow>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => {
                    navigateToUrl(ROOT_PATH);
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.analytics.collectionsCreate.form.cancelButton',
                    {
                      defaultMessage: 'Cancel',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill type="submit" isLoading={isLoading} isDisabled={!canSubmit}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.analytics.collectionsCreate.form.continueButton',
                    {
                      defaultMessage: 'Continue',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
