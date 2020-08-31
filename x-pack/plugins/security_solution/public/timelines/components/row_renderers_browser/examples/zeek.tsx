/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { zeekRowRenderer } from '../../timeline/body/renderers/zeek/zeek_row_renderer';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const ZeekExampleComponent: React.FC = () => (
  <>
    {zeekRowRenderer.renderRow({
      browserFields: {},
      data: mockTimelineData[13].ecs,
      timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
    })}
  </>
);
export const ZeekExample = React.memo(ZeekExampleComponent);
