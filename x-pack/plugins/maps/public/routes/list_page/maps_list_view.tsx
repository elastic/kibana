/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { SavedObjectReference } from 'src/core/types';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { TableListView } from '../../../../../../src/plugins/kibana_react/public';
import { goToSpecifiedPath } from '../../render_app';
import {
  APP_ID,
  getEditPath,
  MAP_PATH,
  MAP_SAVED_OBJECT_TYPE,
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
} from '../../../common/constants';
import {
  getMapsCapabilities,
  getToasts,
  getCoreChrome,
  getExecutionContext,
  getNavigateToApp,
  getSavedObjectsClient,
  getSavedObjectsTagging,
  getUiSettings,
  getTheme,
  getApplication,
} from '../../kibana_services';
import { getAppTitle } from '../../../common/i18n_getters';
import { MapSavedObjectAttributes } from '../../../common/map_saved_object_type';

interface MapItem {
  id: string;
  title: string;
  description?: string;
  references?: SavedObjectReference[];
}

const savedObjectsTagging = getSavedObjectsTagging();
const searchFilters = savedObjectsTagging
  ? [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })]
  : [];

const tableColumns: Array<EuiBasicTableColumn<any>> = [
  {
    field: 'title',
    name: i18n.translate('xpack.maps.mapListing.titleFieldTitle', {
      defaultMessage: 'Title',
    }),
    sortable: true,
    render: (field: string, record: MapItem) => (
      <EuiLink
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          goToSpecifiedPath(getEditPath(record.id));
        }}
        data-test-subj={`mapListingTitleLink-${record.title.split(' ').join('-')}`}
      >
        {field}
      </EuiLink>
    ),
  },
  {
    field: 'description',
    name: i18n.translate('xpack.maps.mapListing.descriptionFieldTitle', {
      defaultMessage: 'Description',
    }),
    dataType: 'string',
    sortable: true,
  },
];
if (savedObjectsTagging) {
  tableColumns.push(savedObjectsTagging.ui.getTableColumnDefinition());
}

function navigateToNewMap() {
  const navigateToApp = getNavigateToApp();
  navigateToApp(APP_ID, {
    path: MAP_PATH,
  });
}

async function findMaps(searchQuery: string) {
  let searchTerm = searchQuery;
  let tagReferences;

  if (savedObjectsTagging) {
    const parsed = savedObjectsTagging.ui.parseSearchQuery(searchQuery, {
      useName: true,
    });
    searchTerm = parsed.searchTerm;
    tagReferences = parsed.tagReferences;
  }

  const resp = await getSavedObjectsClient().find<MapSavedObjectAttributes>({
    type: MAP_SAVED_OBJECT_TYPE,
    search: searchTerm ? `${searchTerm}*` : undefined,
    perPage: getUiSettings().get(SAVED_OBJECTS_LIMIT_SETTING),
    page: 1,
    searchFields: ['title^3', 'description'],
    defaultSearchOperator: 'AND',
    fields: ['description', 'title'],
    hasReference: tagReferences,
  });

  return {
    total: resp.total,
    hits: resp.savedObjects.map((savedObject) => {
      return {
        id: savedObject.id,
        title: savedObject.attributes.title,
        description: savedObject.attributes.description,
        references: savedObject.references,
      };
    }),
  };
}

async function deleteMaps(items: object[]) {
  const deletions = items.map((item) => {
    return getSavedObjectsClient().delete(MAP_SAVED_OBJECT_TYPE, (item as MapItem).id);
  });
  await Promise.all(deletions);
}

export function MapsListView() {
  getExecutionContext().set({
    type: 'application',
    page: 'list',
    id: '',
  });

  const isReadOnly = !getMapsCapabilities().save;
  const listingLimit = getUiSettings().get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = getUiSettings().get(SAVED_OBJECTS_PER_PAGE_SETTING);

  getCoreChrome().docTitle.change(getAppTitle());
  getCoreChrome().setBreadcrumbs([{ text: getAppTitle() }]);

  return (
    <TableListView
      headingId="mapsListingPage"
      rowHeader="title"
      createItem={isReadOnly ? undefined : navigateToNewMap}
      findItems={findMaps}
      deleteItems={isReadOnly ? undefined : deleteMaps}
      tableColumns={tableColumns}
      listingLimit={listingLimit}
      initialFilter={''}
      initialPageSize={initialPageSize}
      entityName={i18n.translate('xpack.maps.mapListing.entityName', {
        defaultMessage: 'map',
      })}
      entityNamePlural={i18n.translate('xpack.maps.mapListing.entityNamePlural', {
        defaultMessage: 'maps',
      })}
      tableCaption={i18n.translate('xpack.maps.mapListing.tableCaption', {
        defaultMessage: 'Maps',
      })}
      tableListTitle={getAppTitle()}
      toastNotifications={getToasts()}
      searchFilters={searchFilters}
      theme={getTheme()}
      application={getApplication()}
    />
  );
}
