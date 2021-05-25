/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './_index.scss';
import React, { FC } from 'react';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { getCoreStart, getPluginsStart } from '../kibana_services';
import {
  IndexDataVisualizerViewProps,
  IndexDataVisualizerView,
} from './components/index_datavisualizer_view';

export const FileDataVisualizer: FC<Omit<IndexDataVisualizerViewProps, 'indexPatterns'>> = (
  props
) => {
  const coreStart = getCoreStart();
  const { data, maps, embeddable, share, security, fileUpload } = getPluginsStart();
  const services = { data, maps, embeddable, share, security, fileUpload, ...coreStart };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <IndexDataVisualizerView indexPatterns={data.indexPatterns} {...props} />
    </KibanaContextProvider>
  );
};
