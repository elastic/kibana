/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SavedObjectReference } from '@kbn/core/types';
import type { SavedObjectsFindOptionsReference, ScopedHistory } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { TableListView } from '@kbn/content-management-table-list';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list';
import { SimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import { APP_ID, getEditPath, MAP_PATH, MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  getMapsCapabilities,
  getCoreChrome,
  getExecutionContext,
  getNavigateToApp,
  getSavedObjectsClient,
  getUiSettings,
  getUsageCollection,
} from '../../kibana_services';
import { getAppTitle } from '../../../common/i18n_getters';
import { MapSavedObjectAttributes } from '../../../common/map_saved_object_type';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

interface MapItem {
  id: string;
  title: string;
  description?: string;
  references?: SavedObjectReference[];
}

interface MapUserContent extends UserContentCommonSchema {
  type: string;
  attributes: {
    title: string;
  };
}

function navigateToNewMap() {
  const navigateToApp = getNavigateToApp();
  getUsageCollection()?.reportUiCounter(APP_ID, METRIC_TYPE.CLICK, 'create_maps_vis_editor');
  navigateToApp(APP_ID, {
    path: MAP_PATH,
  });
}

const toTableListViewSavedObject = (
  savedObject: SimpleSavedObject<MapSavedObjectAttributes>
): MapUserContent => {
  return {
    ...savedObject,
    updatedAt: savedObject.updatedAt!,
    attributes: {
      ...savedObject.attributes,
      title: savedObject.attributes.title ?? '',
    },
  };
};

async function findMaps(
  searchTerm: string,
  {
    references,
    referencesToExclude,
  }: {
    references?: SavedObjectsFindOptionsReference[];
    referencesToExclude?: SavedObjectsFindOptionsReference[];
  } = {}
) {
  const resp = await getSavedObjectsClient().find<MapSavedObjectAttributes>({
    type: MAP_SAVED_OBJECT_TYPE,
    search: searchTerm ? `${searchTerm}*` : undefined,
    perPage: getUiSettings().get(SAVED_OBJECTS_LIMIT_SETTING),
    page: 1,
    searchFields: ['title^3', 'description'],
    defaultSearchOperator: 'AND',
    fields: ['description', 'title'],
    hasReference: references,
    hasNoReference: referencesToExclude,
  });

  return {
    total: resp.total,
    hits: resp.savedObjects.map(toTableListViewSavedObject),
  };
}

async function deleteMaps(items: object[]) {
  const deletions = items.map((item) => {
    return getSavedObjectsClient().delete(MAP_SAVED_OBJECT_TYPE, (item as MapItem).id);
  });
  await Promise.all(deletions);
}

interface Props {
  history: ScopedHistory;
}

export function MapsListView(props: Props) {
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
    <TableListView<MapUserContent>
      id="map"
      headingId="mapsListingPage"
      createItem={isReadOnly ? undefined : navigateToNewMap}
      findItems={findMaps}
      deleteItems={isReadOnly ? undefined : deleteMaps}
      listingLimit={listingLimit}
      initialFilter={''}
      initialPageSize={initialPageSize}
      entityName={i18n.translate('xpack.maps.mapListing.entityName', {
        defaultMessage: 'map',
      })}
      entityNamePlural={i18n.translate('xpack.maps.mapListing.entityNamePlural', {
        defaultMessage: 'maps',
      })}
      tableListTitle={getAppTitle()}
      onClickTitle={({ id }) => props.history.push(getEditPath(id))}
    />
  );
}
