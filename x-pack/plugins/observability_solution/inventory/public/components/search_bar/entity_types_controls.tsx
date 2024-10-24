/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  onChange: (entityTypes: string[]) => void;
}

const toComboBoxOption = (entityType: string): EuiComboBoxOptionOption => ({
  key: entityType,
  label: entityType,
  'data-test-subj': `entityTypesFilter${entityType}Option`,
});

export function EntityTypesControls({ onChange }: Props) {
  const {
    query: { entityTypes = [] },
  } = useInventoryParams('/*');

  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { value, loading } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/types', { signal });
    },
    [inventoryAPIClient]
  );

  const options = value?.entityTypes.map(toComboBoxOption);
  const selectedOptions = entityTypes.map(toComboBoxOption);

  return (
    <EuiComboBox
      data-test-subj="entityTypesFilterComboBox"
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
        { defaultMessage: 'Types' }
      )}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(newOptions) => {
        onChange(newOptions.map((option) => option.key).filter((key): key is string => !!key));
      }}
      isClearable
    />
  );
}
