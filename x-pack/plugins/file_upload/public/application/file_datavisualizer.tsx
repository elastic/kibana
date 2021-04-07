/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './_index.scss';
import React, { FC } from 'react';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import type { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
// import type { MapsStartApi } from '../../../maps/public';
import { SecurityPluginSetup } from '../../../security/public';

// @ts-ignore
import { FileDataVisualizerView } from './components/file_datavisualizer_view/index';

export interface FileDataVisualizerProps {
  data: DataPublicPluginStart;
  embeddable?: EmbeddableStart;
  // maps?: MapsStartApi;
  security?: SecurityPluginSetup;
  coreStart: CoreStart;
}

export const FileDataVisualizer: FC<FileDataVisualizerProps> = ({
  data,
  embeddable,
  // maps,
  security,
  coreStart,
}) => {
  const services = { data, embeddable, /* maps,*/ security, ...coreStart };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <FileDataVisualizerView
        indexPatterns={data.indexPatterns}
        savedObjectsClient={coreStart.savedObjects.client}
      />
    </KibanaContextProvider>
  );
};
