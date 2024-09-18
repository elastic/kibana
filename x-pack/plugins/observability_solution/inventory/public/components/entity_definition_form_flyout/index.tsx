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
import React, { useEffect, useMemo, useState } from 'react';
import { v4 } from 'uuid';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { InventoryEntityDefinition } from '../../../common/entities';

export function EntityDefinitionFormFlyout({
  definition,
  onClose,
  onSubmit,
}: {
  definition: Partial<InventoryEntityDefinition>;
  onClose: () => void;
  onSubmit: (definition: InventoryEntityDefinition) => Promise<void>;
}) {
  const {
    dependencies: {
      start: { dataViews, data },
    },
    services: { inventoryAPIClient },
  } = useKibana();
  const [values, setValues] = useState(definition);

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

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
        .fetch('POST /internal/inventory/entities', {
          signal,
          params: {
            body: {
              kuery: 'entity.type:"data_stream"',
              start,
              end,
            },
          },
        })
        .then((response) => {
          return response.entities.map((entity) => ({
            value: entity.displayName,
            label: entity.displayName,
          }));
        });
    },
    [inventoryAPIClient, start, end]
  );

  const suggestedFieldNamesFetch = useAbortableAsync(
    async ({ signal }) => {
      const indexPatterns = values.sources?.flatMap((source) => source.indexPatterns) ?? [];

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
    [values.sources, dataViews]
  );

  const formId = useGeneratedHtmlId();

  const isManaged = values.managed;

  const disabled = isManaged;

  const indexPatterns = useMemo(() => {
    return values.sources?.flatMap((source) => source.indexPatterns);
  }, [values.sources]);

  const hasIndexPatterns = !!indexPatterns?.length;

  const isValid =
    !!values.type && !!values.label && !!hasIndexPatterns && !!values.identityFields?.length;

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>{definition.label}</h2>
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
              value={values.label}
              disabled={disabled}
              isInvalid={displayErrors && !values.label}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, label: event.target.value }));
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
              placeholder={i18n.translate(
                'xpack.inventory.entityDefinitionFormFlyout.typePlaceholder',
                {
                  defaultMessage: 'service, host, etc`',
                }
              )}
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
              selectedOptions={indexPatterns?.map(
                (indexPattern) => ({ value: indexPattern, label: indexPattern } ?? [])
              )}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  sources: [
                    {
                      indexPatterns: next.map((option) => option.value as string),
                    },
                  ],
                }));
              }}
              isDisabled={disabled}
              isInvalid={displayErrors && !indexPatterns?.length}
              onCreateOption={(next) => {
                setValues((prev) => ({
                  ...prev,
                  sources: [
                    {
                      indexPatterns: [...(prev.sources?.[0].indexPatterns || []), next],
                    },
                  ],
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
                  definitionType: 'inventory',
                  displayNameTemplate: values
                    .identityFields!.map((field) => `{{${field.field}}}`)
                    .join(''),
                  sources: values.sources!,
                  extractionDefinitions: [
                    {
                      metadata:
                        values.metadata?.map((metadataOption) => ({
                          ...metadataOption,
                          limit: 10,
                        })) ?? [],
                      source: values.sources![0],
                    },
                  ],
                  id: v4().substr(0, 16),
                  identityFields: values.identityFields!,
                  label: values.label!,
                  managed: false,
                  metadata: values.metadata ?? [],
                  type: values.type!,
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
