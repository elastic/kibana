/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getMockNetflowData } from '../../../../common/mock/netflow';
import { netflowRowRenderer } from '../../timeline/body/renderers/netflow/netflow_row_renderer';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const NetflowExampleComponent: React.FC = () => (
  <>
    {netflowRowRenderer.renderRow({
      browserFields: {},
      data: getMockNetflowData(),
      timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
    })}
  </>
);
export const NetflowExample = React.memo(NetflowExampleComponent);
