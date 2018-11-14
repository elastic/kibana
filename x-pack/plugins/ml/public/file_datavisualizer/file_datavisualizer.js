/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { I18nProvider } from '@kbn/i18n/react';
import { FileDataVisualizerView } from './components/file_datavisualizer_view';

import React from 'react';

export function FileDataVisualizerPage({ indexPatterns, kibanaConfig }) {
  return (
    <div className="file-datavisualizer-container">
      <I18nProvider>
        <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
      </I18nProvider>
    </div>
  );
}
