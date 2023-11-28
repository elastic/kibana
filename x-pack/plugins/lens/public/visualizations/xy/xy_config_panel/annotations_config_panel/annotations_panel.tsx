/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { AnnotationEditorControls } from '@kbn/event-annotation-components';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import moment from 'moment';
import { search } from '@kbn/data-plugin/public';
import { LENS_APP_NAME } from '../../../../../common/constants';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../../utils';
import { LensAppServices } from '../../../../app_plugin/types';
import { updateLayer } from '..';
import type { FramePublicAPI, VisualizationDimensionEditorProps } from '../../../../types';
import type { State, XYState, XYAnnotationLayerConfig, XYDataLayerConfig } from '../../types';
import { isDataLayer } from '../../visualization_helpers';

export const AnnotationsPanel = (
  props: VisualizationDimensionEditorProps<State> & {
    datatableUtilities: DatatableUtilitiesService;
    dataViewsService: DataViewsPublicPluginStart;
  }
) => {
  const { state, setState, layerId, accessor, frame } = props;

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const index = localState.layers.findIndex((l) => l.layerId === layerId);
  const localLayer = localState.layers.find(
    (l) => l.layerId === layerId
  ) as XYAnnotationLayerConfig;

  const currentAnnotation = localLayer.annotations?.find((c) => c.id === accessor);

  const setAnnotation = useCallback(
    (annotation: EventAnnotationConfig) => {
      if (annotation == null) {
        return;
      }
      const newConfigs = [...(localLayer.annotations || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = annotation;
      } else {
        throw new Error(
          'should never happen because annotation is created before config panel is opened'
        );
      }
      setLocalState(updateLayer(localState, { ...localLayer, annotations: newConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );

  const [currentDataView, setCurrentDataView] = useState<DataView>();

  useEffect(() => {
    const updateDataView = async () => {
      let dataView: DataView;
      const availableIds = await props.dataViewsService.getIds();
      if (availableIds.includes(localLayer.indexPatternId)) {
        dataView = await props.dataViewsService.get(localLayer.indexPatternId);
      } else {
        dataView = await props.dataViewsService.create(
          frame.dataViews.indexPatterns[localLayer.indexPatternId].spec
        );
      }
      setCurrentDataView(dataView);
    };

    updateDataView();
  }, [frame.dataViews.indexPatterns, localLayer.indexPatternId, props.dataViewsService]);

  const queryInputServices = useKibana<LensAppServices>().services;

  if (!currentAnnotation) {
    throw new Error('Annotation not found... this should never happen!');
  }

  return currentDataView ? (
    <AnnotationEditorControls
      annotation={currentAnnotation}
      onAnnotationChange={(newAnnotation) => setAnnotation(newAnnotation)}
      dataView={currentDataView}
      getDefaultRangeEnd={(rangeStart) =>
        getEndTimestamp(
          props.datatableUtilities,
          rangeStart,
          frame,
          localState.layers.filter(isDataLayer)
        )
      }
      queryInputServices={queryInputServices}
      calendarClassName={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
      appName={LENS_APP_NAME}
    />
  ) : null;
};

const getEndTimestamp = (
  datatableUtilities: DatatableUtilitiesService,
  startTime: string,
  { activeData, dateRange }: FramePublicAPI,
  dataLayers: XYDataLayerConfig[]
) => {
  const startTimeNumber = moment(startTime).valueOf();
  const dateRangeFraction =
    (moment(dateRange.toDate).valueOf() - moment(dateRange.fromDate).valueOf()) * 0.1;
  const fallbackValue = moment(startTimeNumber + dateRangeFraction).toISOString();
  const dataLayersId = dataLayers.map(({ layerId }) => layerId);
  if (
    !dataLayersId.length ||
    !activeData ||
    Object.entries(activeData)
      .filter(([key]) => dataLayersId.includes(key))
      .every(([, { rows }]) => !rows || !rows.length)
  ) {
    return fallbackValue;
  }
  const xColumn = activeData?.[dataLayersId[0]].columns.find(
    (column) => column.id === dataLayers[0].xAccessor
  );
  if (!xColumn) {
    return fallbackValue;
  }

  const dateInterval = datatableUtilities.getDateHistogramMeta(xColumn)?.interval;
  if (!dateInterval) return fallbackValue;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return fallbackValue;
  return moment(startTimeNumber + 3 * intervalDuration.as('milliseconds')).toISOString();
};
