/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TERMINATED_PROCESS } from '../../timeline/body/renderers/system/translations';
import { createGenericSystemRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameTerminationEvent } from '../../../../common/mock/mock_endgame_ecs_data';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemExampleComponent: React.FC = () => {
  const systemRowRenderer = createGenericSystemRowRenderer({
    actionName: 'termination_event',
    text: TERMINATED_PROCESS,
  });

  return (
    <>
      {systemRowRenderer.renderRow({
        data: mockEndgameTerminationEvent,
        isDraggable: false,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemExample = React.memo(SystemExampleComponent);
