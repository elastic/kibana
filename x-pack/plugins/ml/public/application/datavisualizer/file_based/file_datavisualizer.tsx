/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { IUiSettingsClient } from 'kibana/public';

import { useTimefilter } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { getIndexPatternsContract } from '../../util/index_utils';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';

// @ts-ignore
import { FileDataVisualizerView } from './components/file_datavisualizer_view/index';

export interface FileDataVisualizerPageProps {
  kibanaConfig: IUiSettingsClient;
}

export const FileDataVisualizerPage: FC<FileDataVisualizerPageProps> = ({ kibanaConfig }) => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const indexPatterns = getIndexPatternsContract();
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;
  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
