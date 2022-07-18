/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mockEndgameFileCreateEvent } from '../../../../common/mock/mock_endgame_ecs_data';
import { createFimRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { CREATED_FILE } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemFimExampleComponent: React.FC = () => {
  const systemFimRowRenderer = createFimRowRenderer({
    actionName: 'file_create_event',
    text: CREATED_FILE,
  });

  return (
    <>
      {systemFimRowRenderer.renderRow({
        data: mockEndgameFileCreateEvent,
        isDraggable: false,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemFimExample = React.memo(SystemFimExampleComponent);
