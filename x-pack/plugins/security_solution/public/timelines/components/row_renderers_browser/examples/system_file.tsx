/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mockEndgameFileDeleteEvent } from '../../../../common/mock/mock_endgame_ecs_data';
import { createGenericFileRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { DELETED_FILE } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemFileExampleComponent: React.FC = () => {
  const systemFileRowRenderer = createGenericFileRowRenderer({
    actionName: 'file_delete_event',
    text: DELETED_FILE,
  });

  return (
    <>
      {systemFileRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameFileDeleteEvent,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemFileExample = React.memo(SystemFileExampleComponent);
