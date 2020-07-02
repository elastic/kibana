/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getMockNetflowData } from '../../../../common/mock/netflow';

import { netflowRowRenderer } from '../../timeline/body/renderers/netflow/netflow_row_renderer';

const NetflowExampleComponent: React.FC = () => (
  <>
    {netflowRowRenderer.renderRow({
      browserFields: {},
      data: getMockNetflowData(),
      timelineId: 'row-renderer-example',
    })}
  </>
);
export const NetflowExample = React.memo(NetflowExampleComponent);
