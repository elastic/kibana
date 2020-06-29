/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import React from 'react';
import { OutPortal, PortalNode } from 'react-reverse-portal';
import minimatch from 'minimatch';
import { IndexPatternMapping, SetQuery } from './types';
import { getLayerList } from './map_config';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/public';
import {
  MapEmbeddable,
  MapEmbeddableInput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/maps/public/embeddable';
import {
  RenderTooltipContentParams,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/maps/public/classes/tooltips/tooltip_property';
import * as i18n from './translations';
import { Query, Filter } from '../../../../../../../src/plugins/data/public';
import {
  EmbeddableStart,
  isErrorEmbeddable,
  EmbeddableOutput,
  ViewMode,
  ErrorEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';
import { IndexPatternSavedObject } from '../../../common/hooks/types';

/**
 * Creates MapEmbeddable with provided initial configuration
 *
 * @param filters any existing global filters
 * @param indexPatterns list of index patterns to configure layers for
 * @param query initial query constraints as Query
 * @param startDate
 * @param endDate
 * @param setQuery function as provided by the GlobalTime component for reacting to refresh
 * @param portalNode wrapper for MapToolTip so it is not rendered in the embeddables component tree
 * @param embeddableApi
 *
 * @throws Error if EmbeddableFactory does not exist
 */
export const createEmbeddable = async (
  filters: Filter[],
  indexPatterns: IndexPatternMapping[],
  query: Query,
  startDate: number,
  endDate: number,
  setQuery: SetQuery,
  portalNode: PortalNode,
  embeddableApi: EmbeddableStart
): Promise<MapEmbeddable | ErrorEmbeddable> => {
  const factory = embeddableApi.getEmbeddableFactory<
    MapEmbeddableInput,
    EmbeddableOutput,
    MapEmbeddable
  >(MAP_SAVED_OBJECT_TYPE);

  if (!factory) {
    throw new Error('Map embeddable factory undefined');
  }

  const input: MapEmbeddableInput = {
    title: i18n.MAP_TITLE,
    id: uuid.v4(),
    filters,
    hidePanelTitles: true,
    query,
    refreshConfig: { value: 0, pause: true },
    timeRange: {
      from: new Date(startDate).toISOString(),
      to: new Date(endDate).toISOString(),
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    openTOCDetails: [],
    hideFilterActions: false,
    mapCenter: { lon: -1.05469, lat: 15.96133, zoom: 1 },
    disabledActions: ['CUSTOM_TIME_RANGE', 'CUSTOM_TIME_RANGE_BADGE'],
  };

  const renderTooltipContent = ({
    addFilters,
    closeTooltip,
    features,
    isLocked,
    getLayerName,
    loadFeatureProperties,
    loadFeatureGeometry,
  }: RenderTooltipContentParams) => {
    const props = {
      addFilters,
      closeTooltip,
      features,
      isLocked,
      getLayerName,
      loadFeatureProperties,
      loadFeatureGeometry,
    };
    return <OutPortal node={portalNode} {...props} />;
  };

  const embeddableObject = await factory.create(input);

  if (!embeddableObject) {
    throw new Error('Map embeddable is undefined');
  }

  if (!isErrorEmbeddable(embeddableObject)) {
    embeddableObject.setRenderTooltipContent(renderTooltipContent);
    // @ts-ignore
    await embeddableObject.setLayerList(getLayerList(indexPatterns));
  }

  // Wire up to app refresh action
  setQuery({
    id: 'embeddedMap', // Scope to page type if using map elsewhere
    inspect: null,
    loading: false,
    refetch: () => embeddableObject.reload(),
  });

  return embeddableObject;
};

// These patterns are overly greedy and must be excluded when matching against Security indexes.
const ignoredIndexPatterns = ['*', '*:*'];

/**
 * Returns kibanaIndexPatterns that wildcard match at least one of siemDefaultIndices
 *
 * @param kibanaIndexPatterns
 * @param siemDefaultIndices
 */
export const findMatchingIndexPatterns = ({
  kibanaIndexPatterns,
  siemDefaultIndices,
}: {
  kibanaIndexPatterns: IndexPatternSavedObject[];
  siemDefaultIndices: string[];
}): IndexPatternSavedObject[] => {
  try {
    return kibanaIndexPatterns.filter((kip) => {
      const pattern = kip.attributes.title;
      return (
        !ignoredIndexPatterns.includes(pattern) &&
        siemDefaultIndices.some((sdi) => minimatch(sdi, pattern))
      );
    });
  } catch {
    return [];
  }
};
