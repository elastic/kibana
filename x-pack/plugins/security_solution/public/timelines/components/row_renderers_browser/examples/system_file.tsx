/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockEndgameFileDeleteEvent } from '../../../../common/mock/mock_endgame_ecs_data';
import { createGenericFileRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';

const SystemFileExampleComponent: React.FC = () => {
  const systemFileRowRenderer = createGenericFileRowRenderer({
    actionName: 'file_delete_event',
    text: 'deleted a file',
  });

  return (
    <>
      {systemFileRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameFileDeleteEvent,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemFileExample = React.memo(SystemFileExampleComponent);
