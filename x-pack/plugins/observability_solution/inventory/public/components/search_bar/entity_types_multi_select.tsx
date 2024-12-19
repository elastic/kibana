/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { entityTypesRt, type EntityType } from '../../../common/rt_types';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryDecodedQueryParams } from '../../hooks/use_inventory_decoded_query_params';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { groupEntityTypesByStatus } from '../../utils/group_entity_types_by_status';

export function EntityTypesMultiSelect() {
  const inventoryRoute = useInventoryRouter();
  const { query } = useInventoryParams('/*');
  const { entityTypes: selectedEntityTypes } = useInventoryDecodedQueryParams();

  const {
    services: { inventoryAPIClient, telemetry },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { value, loading } = useInventoryAbortableAsync(
    ({ signal }) => inventoryAPIClient.fetch('GET /internal/inventory/entities/types', { signal }),
    [inventoryAPIClient]
  );

  const items = useMemo(
    () =>
      value?.entityTypes.map((type): EuiSelectableOption => {
        const checked = selectedEntityTypes?.[type];
        return {
          label: type,
          checked,
          'data-test-subj': `entityTypes_multiSelect_filter_selection_${type}`,
        };
      }) || [],
    [selectedEntityTypes, value?.entityTypes]
  );

  const registerEntityTypeFilteredEvent = useCallback(
    ({ filterEntityTypes }: { filterEntityTypes: EntityType }) => {
      const { entityTypesOff, entityTypesOn } = groupEntityTypesByStatus(filterEntityTypes);

      telemetry.reportEntityInventoryEntityTypeFiltered({
        include_entity_types: entityTypesOn,
        exclude_entity_types: entityTypesOff,
      });
    },
    [telemetry]
  );

  function handleEntityTypeChecked(nextItems: EntityType) {
    registerEntityTypeFilteredEvent({ filterEntityTypes: nextItems });
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        entityTypes: entityTypesRt.encode(nextItems),
      },
    });
  }

  return (
    <EuiFilterGroup>
      <EuiPopover
        id="entityTypeMultiSelector"
        button={
          <EuiFilterButton
            data-test-subj="entityTypes_multiSelect_filter"
            iconType="arrowDown"
            badgeColor="success"
            onClick={() => setIsPopoverOpen((state) => !state)}
            isSelected={isPopoverOpen}
            numFilters={items.filter((item) => item.checked !== 'off').length}
            hasActiveFilters={!!items.find((item) => item.checked === 'on')}
            numActiveFilters={items.filter((item) => item.checked === 'on').length}
          >
            {i18n.translate('xpack.inventory.entityTypesMultSelect.typeFilterButtonLabel', {
              defaultMessage: 'Type',
            })}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          allowExclusions
          searchable
          searchProps={{
            placeholder: i18n.translate(
              'xpack.inventory.entityTypesMultSelect.euiSelectable.placeholder',
              { defaultMessage: 'Filter types' }
            ),
            compressed: true,
          }}
          aria-label={i18n.translate(
            'xpack.inventory.entityTypesMultSelect.euiSelectable.typeLabel',
            { defaultMessage: 'Entity type' }
          )}
          options={items}
          onChange={(newOptions) => {
            handleEntityTypeChecked(
              newOptions
                .filter((item) => item.checked)
                .reduce<EntityType>((acc, curr) => ({ ...acc, [curr.label]: curr.checked! }), {})
            );
          }}
          isLoading={loading}
          loadingMessage={i18n.translate(
            'xpack.inventory.entityTypesMultSelect.euiSelectable.loading',
            { defaultMessage: 'Loading types' }
          )}
          emptyMessage={i18n.translate(
            'xpack.inventory.entityTypesMultSelect.euiSelectable.empty',
            { defaultMessage: 'No types available' }
          )}
          noMatchesMessage={i18n.translate(
            'xpack.inventory.entityTypesMultSelect.euiSelectable.notFound',
            { defaultMessage: 'No types found' }
          )}
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}
