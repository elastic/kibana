/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { createEndgameProcessRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameCreationEvent } from '../../../../common/mock/mock_endgame_ecs_data';

const SystemEndgameProcessExampleComponent: React.FC = () => {
  const systemEndgameProcessRowRenderer = createEndgameProcessRowRenderer({
    actionName: 'creation_event',
    text: 'started process',
  });

  return (
    <>
      {systemEndgameProcessRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameCreationEvent,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemEndgameProcessExample = React.memo(SystemEndgameProcessExampleComponent);
