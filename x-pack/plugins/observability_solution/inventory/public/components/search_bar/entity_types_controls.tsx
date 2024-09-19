/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import React from 'react';
import { EntityType } from '../../../common/entities';
import { useKibana } from '../../hooks/use_kibana';
import { getEntityTypeLabel } from '../../utils/get_entity_type_label';
import { useInventoryParams } from '../../hooks/use_inventory_params';

// TODO: remove it
const DEFAULT_ENTITY_TYPES: EntityType[] = ['service', 'host', 'container'];

interface Props {
  onChange: (entityTypes: EntityType[]) => void;
}

const toComboBoxOption = (entityType: EntityType): EuiComboBoxOptionOption<EntityType> => ({
  key: entityType,
  label: getEntityTypeLabel(entityType),
});

export function EntityTypesControls({ onChange }: Props) {
  const {
    query: { entityTypes = [] },
  } = useInventoryParams('/*');

  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { value, loading } = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/types', { signal });
    },
    [inventoryAPIClient]
  );

  // const options = value?.entityTypes.map(toComboBoxOption);
  const options = DEFAULT_ENTITY_TYPES.map(toComboBoxOption);
  const selectedOptions = entityTypes.map(toComboBoxOption);

  return (
    <EuiComboBox<EntityType>
      isLoading={loading}
      css={css`
        max-width: 325px;
      `}
      aria-label={i18n.translate(
        'xpack.inventory.entityTypesControls.euiComboBox.accessibleScreenReaderLabel',
        { defaultMessage: 'Entity types filter' }
      )}
      placeholder={i18n.translate(
        'xpack.inventory.entityTypesControls.euiComboBox.placeHolderLabel',
        { defaultMessage: 'Entity types' }
      )}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(newOptions) => {
        onChange(newOptions.map((option) => option.key as EntityType));
      }}
      isClearable={true}
    />
  );
}
