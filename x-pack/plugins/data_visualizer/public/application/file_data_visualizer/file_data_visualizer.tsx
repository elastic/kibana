/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import type { ResultLink } from '../common/components/results_links/results_links';
import '../_index.scss';
// @ts-ignore
import { FileDataVisualizerView } from './components/file_data_visualizer_view/index';

interface Props {
  additionalLinks?: ResultLink[];
}

export type FileDataVisualizerSpec = typeof FileDataVisualizer;
export const FileDataVisualizer: FC<Props> = ({ additionalLinks }) => {
  const coreStart = getCoreStart();
  const { data, maps, embeddable, share, security, fileUpload } = getPluginsStart();
  const services = {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    ...coreStart,
  };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <FileDataVisualizerView
        indexPatterns={data.indexPatterns}
        savedObjectsClient={coreStart.savedObjects.client}
        http={coreStart.http}
        fileUpload={fileUpload}
        resultsLinks={additionalLinks}
      />
    </KibanaContextProvider>
  );
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FileDataVisualizer;
