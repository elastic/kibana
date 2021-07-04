/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { useMlKibana, useTimefilter } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { HelpMenu } from '../../components/help_menu';
import type { IndexDataVisualizerViewProps } from '../../../../../data_visualizer/public';
export const IndexDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { docLinks, dataVisualizer },
  } = useMlKibana();
  const [
    IndexDataVisualizer,
    setIndexDataVisualizer,
  ] = useState<FC<IndexDataVisualizerViewProps> | null>(null);

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getIndexDataVisualizerComponent } = dataVisualizer;
      getIndexDataVisualizerComponent().then(setIndexDataVisualizer);
    }
  }, []);
  return IndexDataVisualizer ? (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      {IndexDataVisualizer}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  ) : (
    <Fragment />
  );
};
