/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';

import { useTimefilter } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';

export const FileDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { docLinks, dataVisualizer },
  } = useMlKibana();
  const [FileDataVisualizer, setFileDataVisualizer] = useState<FC<{}> | null>(null);

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getFileDataVisualizerComponent } = dataVisualizer;
      getFileDataVisualizerComponent().then(setFileDataVisualizer);
    }
  }, []);

  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      {FileDataVisualizer}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  );
};
