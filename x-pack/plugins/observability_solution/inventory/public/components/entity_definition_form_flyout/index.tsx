/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { EntityTypeDefinition } from '../../../common/entities';
import { useKibana } from '../../hooks/use_kibana';

export function EntityDefinitionFormFlyout({
  definition,
  onClose,
  onSubmit,
}: {
  definition: Partial<Required<EntityTypeDefinition>['discoveryDefinition']>;
  onClose: () => void;
  onSubmit: (definition: Required<EntityTypeDefinition>['discoveryDefinition']) => Promise<void>;
}) {
  const {
    dependencies: {
      start: { dataViews },
    },
    services: { inventoryAPIClient },
  } = useKibana();
  const [values, setValues] = useState(definition);

  useEffect(() => {
    setValues({
      ...definition,
    });
  }, [definition]);

  const [displayErrors, setDisplayErrors] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const dataStreamsFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('GET /internal/inventory/datasets', {
          signal,
        })
        .then((response) => {
          return response.datasets.map((dataset) => ({ value: dataset.id, label: dataset.name }));
        });
    },
    [inventoryAPIClient]
  );

  const suggestedFieldNamesFetch = useAbortableAsync(
    async ({ signal }) => {
      const indexPatterns = values.indexPatterns ?? [];

      if (!indexPatterns.length) {
        return [];
      }

      return dataViews
        .getFieldsForWildcard({
          pattern: indexPatterns.join(','),
          type: 'keyword',
          indexFilter: {
            bool: {
              filter: [...excludeFrozenQuery()],
            },
          },
          includeEmptyFields: false,
        })
        .then((specs) => {
          return specs.map((spec) => ({ label: spec.name, value: spec.name }));
        });
    },
    [values.indexPatterns, dataViews]
  );

  const formId = useGeneratedHtmlId();

  const isManaged = values.managed;

  const disabled = isManaged;

  const isValid =
    !!values.name &&
    !!values.type &&
    !!values.indexPatterns?.length &&
    !!values.identityFields?.length;

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>{definition.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth component="form" id={formId}>
          <EuiFormRow
            label={i18n.translate('xpack.inventory.entityDefinitionFormFlyout.displayNameLabel', {
              defaultMessage: 'Display name',
            })}
          >
            <EuiFieldText
              data-test-subj="inventoryEntityDefinitionFormFlyoutFieldText"
              placeholder={i18n.translate(
                'xpack.inventory.entityDefinitionFormFlyout.displayLabelPlaceholder',
                {
                  defaultMessage: 'Services, hosts, etc',
                }
              )}
              value={values.name}
              disabled={disabled}
              isInvalid={displayErrors && !values.name}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, name: event.target.value }));
              }}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.inventory.entityDefinitionFormFlyout.typeLabel', {
              defaultMessage: 'Type',
            })}
          >
            <EuiComboBox
              singleSelection
              noSuggestions
              selectedOptions={[
                ...(values.type ? [{ label: values.type, value: values.type }] : []),
              ]}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  type: next[0].value,
                }));
              }}
              onCreateOption={(next) => {
                setValues((prev) => ({
                  ...prev,
                  type: next,
                }));
              }}
              isDisabled={disabled}
              isInvalid={displayErrors && !values.identityFields?.length}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.inventory.entityDefinitionFormFlyout.indexPatternLabel', {
              defaultMessage: 'Index patterns',
            })}
          >
            <EuiComboBox
              options={dataStreamsFetch.value ?? []}
              selectedOptions={values.indexPatterns?.map(
                (indexPattern) => ({ value: indexPattern, label: indexPattern } ?? [])
              )}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  indexPatterns: next.map((option) => option.value as string),
                }));
              }}
              isDisabled={disabled}
              isInvalid={displayErrors && !values.indexPatterns?.length}
              onCreateOption={(next) => {
                setValues((prev) => ({
                  ...prev,
                  indexPatterns: (prev.indexPatterns || []).concat(next),
                }));
              }}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                {i18n.translate('xpack.inventory.entityDefinitionFormFlyout.identityFieldsLabel', {
                  defaultMessage: 'Identity field',
                })}
                {suggestedFieldNamesFetch.loading ? <EuiLoadingSpinner size="s" /> : null}
              </EuiFlexGroup>
            }
          >
            <EuiComboBox
              singleSelection
              options={suggestedFieldNamesFetch.value}
              selectedOptions={values.identityFields?.map(
                (identityField) =>
                  ({ value: identityField.field, label: identityField.field } ?? [])
              )}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  identityFields: next.map((option) => ({
                    field: option.value as string,
                    optional: false,
                  })),
                }));
              }}
              isDisabled={disabled}
              isInvalid={displayErrors && !values.identityFields?.length}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                {i18n.translate('xpack.inventory.entityDefinitionFormFlyout.metadataFieldsLabel', {
                  defaultMessage: 'Metadata fields',
                })}
                {suggestedFieldNamesFetch.loading ? <EuiLoadingSpinner size="s" /> : null}
              </EuiFlexGroup>
            }
          >
            <EuiComboBox
              options={suggestedFieldNamesFetch.value}
              selectedOptions={values.metadata?.map(
                (metadata) => ({ value: metadata.source, label: metadata.source } ?? [])
              )}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  metadata: next.map((option) => ({
                    source: option.value as string,
                    destination: option.value as string,
                    limit: 10,
                  })),
                }));
              }}
              isDisabled={disabled}
              isInvalid={displayErrors && !values.metadata?.length}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup direction="row" justifyContent="flexEnd">
          <EuiButton
            data-test-subj="inventoryEntityDefinitionFormFlyoutButton"
            fill
            isDisabled={submitting}
            onClick={() => {
              if (!isValid) {
                setDisplayErrors(true);
              } else {
                setSubmitting(true);
                onSubmit({
                  history: {
                    timestampField: '@timestamp',
                    interval: '1m',
                    settings: {
                      lookbackPeriod: '10m',
                      frequency: '2m',
                      syncDelay: '2m',
                    },
                  },
                  id: v4().substring(0, 32),
                  managed: false,
                  name: '',
                  indexPatterns: [],
                  type: '',
                  version: '1.0.0',
                  identityFields: [],
                  displayNameTemplate: `${
                    values.identityFields?.map((field) => `{{${field.field}}}`).join('') ?? ''
                  }`,
                  ...values,
                }).finally(() => {
                  setSubmitting(false);
                });
              }
            }}
            type="submit"
          >
            {i18n.translate(
              'xpack.inventory.entityDefinitionFormFlyout.createEntityDefinitionButtonLabel',
              {
                defaultMessage: 'Create entity definition',
              }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
