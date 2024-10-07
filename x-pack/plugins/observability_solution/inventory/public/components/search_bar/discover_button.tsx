/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { buildPhrasesFilter, PhrasesFilter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { defaultEntityDefinitions } from '../../../common/entities';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { EntityColumnIds } from '../entities_grid';

const ACTIVE_COLUMNS: EntityColumnIds[] = [ENTITY_DISPLAY_NAME, ENTITY_TYPE, ENTITY_LAST_SEEN];

export function DiscoverButton({ dataView }: { dataView: DataView }) {
  const {
    services: { share, application },
  } = useKibana();
  const {
    query: { kuery, entityTypes },
  } = useInventoryParams('/*');

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const filters: PhrasesFilter[] = [];

  const entityDefinitionField = dataView.getFieldByName(ENTITY_DEFINITION_ID);

  if (entityDefinitionField) {
    const entityDefinitionFilter = buildPhrasesFilter(
      entityDefinitionField!,
      defaultEntityDefinitions,
      dataView
    );
    filters.push(entityDefinitionFilter);
  }

  const entityTypeField = dataView.getFieldByName(ENTITY_TYPE);

  if (entityTypes && entityTypeField) {
    const entityTypeFilter = buildPhrasesFilter(entityTypeField, entityTypes, dataView);
    filters.push(entityTypeFilter);
  }

  const discoverLink = discoverLocator?.getRedirectUrl({
    indexPatternId: dataView?.id ?? '',
    columns: ACTIVE_COLUMNS,
    query: { query: kuery ?? '', language: 'kuery' },
    filters,
  });

  if (!application.capabilities.discover?.show || !discoverLink) {
    return null;
  }

  return (
    <EuiButton
      color="text"
      iconType="discoverApp"
      href={discoverLink}
      data-test-subj="inventorySearchBarDiscoverButton"
    >
      {i18n.translate('xpack.inventory.searchBar.discoverButton', {
        defaultMessage: 'Open in discover',
      })}
    </EuiButton>
  );
}
