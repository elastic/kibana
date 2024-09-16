/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { LoadingPanel } from '../loading_panel';
import { EntityTypeDefinition } from '../../../common/entities';
import { EntityDefinitionFormFlyout } from '../entity_definition_form_flyout';
import { CreateEntityTypeDefinitionButton } from './create_entity_type_definition_button';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';

function EnableEntityDiscoveryCallout({ onEnableClick }: { onEnableClick: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  return (
    <EuiCallOut
      title={i18n.translate('xpack.inventory.definitionsView.enableEntityDiscoveryCalloutTitle', {
        defaultMessage: 'Enable entity discovery',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
        <EuiText>
          {i18n.translate('xpack.inventory.definitionsView.enableEntityDiscoveryCalloutTitle', {
            defaultMessage: 'Enable automatic discovery of entities.',
          })}
        </EuiText>
        <EuiButton
          fullWidth={false}
          fill
          data-test-subj="inventoryDefinitionsViewContentEnableButton"
          onClick={() => {
            setLoading(true);
            onEnableClick().finally(() => {
              setLoading(false);
            });
          }}
          disabled={loading}
          isLoading={loading}
        >
          {i18n.translate('xpack.inventory.definitionsViewContent.enableButtonLabel', {
            defaultMessage: 'Enable',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

function DefinitionsViewContent() {
  const {
    core: { notifications },
    dependencies: {
      start: {
        entityManager: { entityClient },
      },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const entityTypesFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entity_types', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  const isDiscoveryEnabledFetch = useAbortableAsync(
    ({ signal }) => {
      return entityClient.isManagedEntityDiscoveryEnabled();
    },
    [entityClient]
  );

  const [selectedDiscoveryDefinition, setSelectedDiscoveryDefinition] = useState<
    Required<EntityTypeDefinition>['discoveryDefinition'] | undefined
  >();

  const columns = useMemo(() => {
    const items: Array<EuiBasicTableColumn<EntityTypeDefinition>> = [
      {
        name: 'label',
        field: 'label',
        render: (value, definition) => {
          const { icon, label, discoveryDefinition } = definition;
          return (
            <EuiLink
              data-test-subj="definitionsView"
              onClick={() => {
                setSelectedDiscoveryDefinition(definition.discoveryDefinition);
              }}
              disabled={!discoveryDefinition}
            >
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                <EuiIcon type={icon} size="s" />
                <EuiText size="s">{label}</EuiText>
                {discoveryDefinition?.managed || !discoveryDefinition ? (
                  <EuiBadge>
                    {i18n.translate('xpack.inventory.definitionsViewTable.managed', {
                      defaultMessage: 'Managed',
                    })}
                  </EuiBadge>
                ) : null}
              </EuiFlexGroup>
            </EuiLink>
          );
        },
      },
    ];

    return items;
  }, []);

  const items = useMemo(() => {
    return entityTypesFetch.value?.definitions ?? [];
  }, [entityTypesFetch.value?.definitions]);

  if (isDiscoveryEnabledFetch.loading) {
    return <LoadingPanel loading />;
  }

  if (!isDiscoveryEnabledFetch.value?.enabled) {
    return (
      <EnableEntityDiscoveryCallout
        onEnableClick={() => {
          return entityClient
            .enableManagedEntityDiscovery()
            .catch((error) => {
              notifications.showErrorDialog({
                title: i18n.translate('xpack.inventory.definitionsOverview.failedToEnableEEM', {
                  defaultMessage: `Failed to enable entity discovery`,
                }),
                error,
              });
              throw error;
            })
            .then(() => {
              entityTypesFetch.refresh();
              isDiscoveryEnabledFetch.refresh();
            });
        }}
      />
    );
  }

  return (
    <>
      {selectedDiscoveryDefinition ? (
        <EntityDefinitionFormFlyout
          onClose={() => {
            setSelectedDiscoveryDefinition(undefined);
          }}
          definition={selectedDiscoveryDefinition}
          onSubmit={async (definition) => {
            return entityClient
              .updateEntityDefinition(definition.id, {
                version: definition.version,
                description: definition.description,
              })
              .catch((error) => {
                notifications.showErrorDialog({
                  title: i18n.translate('xpack.inventory.definitionsView.updateDefinitionError', {
                    defaultMessage: 'Failed to update entity definition',
                  }),
                  error,
                });
                throw error;
              });
          }}
        />
      ) : null}
      <EuiFlexGroup direction="column" alignItems="flexEnd">
        <EuiBasicTable columns={columns} items={items} />
        <CreateEntityTypeDefinitionButton
          onSubmit={async (definition) => {
            return entityClient.createEntityDefinition(definition).catch((error) => {
              notifications.showErrorDialog({
                title: i18n.translate('xpack.inventory.definitionsView.createDefinitionError', {
                  defaultMessage: 'Failed to create entity definition',
                }),
                error,
              });
              throw error;
            });
          }}
        />
      </EuiFlexGroup>
    </>
  );
}

export function DefinitionsView() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle
          title={i18n.translate('xpack.inventory.definitionsOverview.pageTitle', {
            defaultMessage: 'Definitions',
          })}
        />
      </InventoryPageHeader>
      <DefinitionsViewContent />
    </EuiFlexGroup>
  );
}
