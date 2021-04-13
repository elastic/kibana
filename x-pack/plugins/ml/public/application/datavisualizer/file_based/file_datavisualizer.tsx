/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import type { CoreStart } from 'kibana/public';

import { useTimefilter } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';
import { FileDataVisualizer } from '../../../../../file_data_visualizer/public';

export const FileDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { docLinks, data, embeddable, share, maps, security, savedObjects, http },
  } = useMlKibana();
  const coreStart = { savedObjects, http } as CoreStart;
  const helpLink = docLinks.links.ml.guide;
  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizer
        coreStart={coreStart}
        data={data}
        embeddable={embeddable}
        share={share}
        maps={maps}
        security={security}
      />
      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
