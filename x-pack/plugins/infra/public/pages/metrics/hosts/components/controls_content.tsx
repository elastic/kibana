/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/public';
import { EmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { Filter, TimeRange } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { MissingEmbeddableFactoryCallout } from '../../../../components/missing_embeddable_factory_callout';

interface Props {
  timeRange: TimeRange;
  dataViewId: string;
  filters: Filter[];
  query: {
    language: string;
    query: string;
  };
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const ControlsToolbar: React.FC<Props> = (props) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  if (!embeddablePlugin) return null;
  return <ControlsContent {...props} />;
};

export const ControlsContent: React.FC<Props> = ({ timeRange, dataViewId, query, filters }) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  const factory = embeddablePlugin?.getEmbeddableFactory(CONTROL_GROUP_TYPE);

  const embeddableInput: ControlGroupInput = useMemo(() => {
    return {
      id: dataViewId, // Which id should be passed here
      type: CONTROL_GROUP_TYPE, // Correct Type ?
      timeRange: {
        from: moment(timeRange.to).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        to: moment(timeRange.from).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      },
      refreshConfig: REFRESH_CONFIG,
      viewMode: ViewMode.VIEW,
      filters, // Do I need to pass filters/query?
      query,
      chainingSystem: 'NONE',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: {
        panelId1: {
          order: 0,
          width: 'small',
          grow: true,
          type: 'optionsListControl', // Is this the correct type
          explicitInput: {
            title: 'Operating System',
            fieldName: 'OperatingSystemName', // ?
            id: 'panelId1', // Same here - which id should we set?
            selectedOptions: ['macOs'],
            enhancements: {},
          },
        },
        panelId2: {
          order: 1,
          width: 'small',
          grow: true,
          type: 'optionsListControl',
          explicitInput: {
            title: 'Cloud provider',
            fieldName: 'CloudProviderName', // ?
            id: 'panelId2', // Same here - which id should we set?
            enhancements: {},
          },
        },
      },
    };
  }, [dataViewId, timeRange.to, timeRange.from, filters, query]);

  if (!factory) {
    return <MissingEmbeddableFactoryCallout embeddableType={CONTROL_GROUP_TYPE} />;
  }

  return <EmbeddableRenderer input={embeddableInput} factory={factory} />;
};
