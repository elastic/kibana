/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { EntityV2 } from '@kbn/entities-schema';
import { usePluginContext } from '../../hooks/use_plugin_context';

function EntitySourceForm({
  source,
  index,
  onFieldChange,
}: {
  source: any;
  index: number;
  onFieldChange: Function;
}) {
  const onArrayFieldChange =
    (field: Exclude<keyof EntitySource, 'id'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (!value) {
        onFieldChange(index, field, []);
      } else {
        onFieldChange(index, field, e.target.value.trim().split(','));
      }
    };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow label="Index patterns (comma-separated)">
          <EuiFieldText
            data-test-subj="entityManagerFormIndexPatterns"
            name="index_patterns"
            defaultValue={source.index_patterns.join(',')}
            isInvalid={source.index_patterns.length === 0}
            onChange={onArrayFieldChange('index_patterns')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label="Identify fields (comma-separated field names)">
          <EuiFieldText
            data-test-subj="entityManagerFormIdentityFields"
            name="identity_fields"
            defaultValue={source.identity_fields.join(',')}
            isInvalid={source.identity_fields.length === 0}
            onChange={onArrayFieldChange('identity_fields')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label="Filters (comma-separated ESQL filters)">
          <EuiFieldText
            data-test-subj="entityManagerFormFilters"
            name="filters"
            defaultValue={source.filters.join(',')}
            onChange={onArrayFieldChange('filters')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label="Metadata (comma-separated field names)">
          <EuiFieldText
            data-test-subj="entityManagerFormMetadata"
            name="metadata"
            defaultValue={source.metadata_fields.join(',')}
            onChange={onArrayFieldChange('metadata_fields')}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label="Timestamp field">
          <EuiFieldText
            data-test-subj="entityManagerFormTimestamp"
            name="timestamp_field"
            defaultValue={source.timestamp_field}
            onChange={(e) => onFieldChange(index, 'timestamp_field', e.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow label="Display name">
          <EuiFieldText
            data-test-subj="entityManagerFormDisplayName"
            name="display_name"
            defaultValue={source.display_name}
            onChange={(e) => onFieldChange(index, 'display_name', e.target.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface EntitySource {
  id: string;
  index_patterns: string[];
  identity_fields: string[];
  metadata_fields: string[];
  filters: string[];
  timestamp_field?: string;
  display_name?: string;
}

const newEntitySource = ({
  indexPatterns = [],
  identityFields = [],
  metadataFields = [],
  filters = [],
  timestampField = '@timestamp',
}: {
  indexPatterns?: string[];
  identityFields?: string[];
  metadataFields?: string[];
  filters?: string[];
  timestampField?: string;
}): EntitySource => ({
  id: uuid(),
  index_patterns: indexPatterns,
  identity_fields: identityFields,
  metadata_fields: metadataFields,
  timestamp_field: timestampField,
  filters,
});

export function EntityManagerOverviewPage() {
  const { ObservabilityPageTemplate, entityClient } = usePluginContext();
  const [previewEntities, setPreviewEntities] = useState<EntityV2[]>([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [entityType, setEntityType] = useState('service');
  const [entitySources, setEntitySources] = useState([
    newEntitySource({
      indexPatterns: ['remote_cluster:logs-*'],
      identityFields: ['service.name'],
    }),
  ]);

  const searchEntities = async () => {
    if (
      !entitySources.some(
        (source) => source.identity_fields.length > 0 && source.index_patterns.length > 0
      )
    ) {
      setFormErrors(['No valid source found']);
      return;
    }

    setIsSearchingEntities(true);
    setFormErrors([]);
    setPreviewError(null);

    try {
      const { entities } = await entityClient.repositoryClient(
        'POST /internal/entities/v2/_search/preview',
        {
          params: {
            body: {
              sources: entitySources
                .filter(
                  (source) => source.index_patterns.length > 0 && source.identity_fields.length > 0
                )
                .map((source) => ({ ...source, type_id: entityType })),
            },
          },
        }
      );

      setPreviewEntities(entities);
    } catch (err) {
      setPreviewError(err.body?.message);
    } finally {
      setIsSearchingEntities(false);
    }
  };

  return (
    <ObservabilityPageTemplate
      data-test-subj="entitiesPage"
      pageHeader={{
        bottomBorder: true,
        pageTitle: 'Entity Manager',
      }}
    >
      <EuiForm component="form" isInvalid={formErrors.length > 0} error={formErrors}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>Entity type</h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldText
                data-test-subj="entityManagerFormType"
                name="type"
                defaultValue={entityType}
                placeholder="host, service, user..."
                onChange={(e) => {
                  setEntityType(e.target.value.trim());
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>Entity sources</h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="entityManagerFormAddSource"
              iconType="plusInCircle"
              onClick={() => setEntitySources([...entitySources, newEntitySource({})])}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {entitySources.map((source, i) => (
          <div key={source.id}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>Source {i + 1}</h4>
                </EuiTitle>
              </EuiFlexItem>
              {entitySources.length > 1 ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    data-test-subj="entityManagerFormRemoveSource"
                    color={'danger'}
                    iconType={'minusInCircle'}
                    onClick={() => {
                      entitySources.splice(i, 1);
                      setEntitySources(entitySources.map((_source) => ({ ..._source })));
                    }}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EntitySourceForm
              source={source}
              index={i}
              onFieldChange={(
                index: number,
                field: Exclude<keyof EntitySource, 'id'>,
                value: any
              ) => {
                entitySources[index][field] = value;
                setEntitySources([...entitySources]);
              }}
            />
            {i === entitySources.length - 1 ? (
              <EuiSpacer size="m" />
            ) : (
              <EuiHorizontalRule margin="m" />
            )}
          </div>
        ))}

        <EuiFormRow>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                data-test-subj="entityManagerFormPreview"
                isDisabled={isSearchingEntities}
                onClick={searchEntities}
              >
                Preview
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton data-test-subj="entityManagerFormCreate" isDisabled={true} color="primary">
                Create
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>

      <EuiSpacer size="s" />

      {previewError ? (
        <EuiCallOut title="Error previewing entity definition" color="danger" iconType="error">
          <p>{previewError}</p>
        </EuiCallOut>
      ) : null}

      <EuiBasicTable
        loading={isSearchingEntities}
        tableCaption={'Preview entities'}
        items={previewEntities}
        columns={[
          {
            field: 'entity.id',
            name: 'entity.id',
          },
          {
            field: 'entity.display_name',
            name: 'entity.display_name',
          },
          {
            field: 'entity.type',
            name: 'entity.type',
          },
          {
            field: 'entity.last_seen_timestamp',
            name: 'entity.last_seen_timestamp',
          },
          ...Array.from(new Set(entitySources.flatMap((source) => source.identity_fields))).map(
            (field) => ({ field, name: field })
          ),
          ...Array.from(new Set(entitySources.flatMap((source) => source.metadata_fields))).map(
            (field) => ({ field, name: field })
          ),
        ]}
      />
    </ObservabilityPageTemplate>
  );
}
