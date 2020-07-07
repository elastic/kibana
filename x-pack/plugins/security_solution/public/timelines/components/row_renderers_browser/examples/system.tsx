/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { createGenericSystemRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameTerminationEvent } from '../../../../common/mock/mock_endgame_ecs_data';

const SystemExampleComponent: React.FC = () => {
  const systemRowRenderer = createGenericSystemRowRenderer({
    actionName: 'termination_event',
    text: 'terminated process',
  });

  return (
    <>
      {systemRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameTerminationEvent,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemExample = React.memo(SystemExampleComponent);
