/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createEndgameProcessRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameCreationEvent } from '../../../../common/mock/mock_endgame_ecs_data';
import { PROCESS_STARTED } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemEndgameProcessExampleComponent: React.FC = () => {
  const systemEndgameProcessRowRenderer = createEndgameProcessRowRenderer({
    actionName: 'creation_event',
    text: PROCESS_STARTED,
  });

  return (
    <>
      {systemEndgameProcessRowRenderer.renderRow({
        data: mockEndgameCreationEvent,
        isDraggable: false,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemEndgameProcessExample = React.memo(SystemEndgameProcessExampleComponent);
