/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { createSecurityEventRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameUserLogon } from '../../../../common/mock/mock_endgame_ecs_data';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const SystemSecurityEventExampleComponent: React.FC = () => {
  const systemSecurityEventRowRenderer = createSecurityEventRowRenderer({
    actionName: 'user_logon',
  });

  return (
    <>
      {systemSecurityEventRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameUserLogon,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const SystemSecurityEventExample = React.memo(SystemSecurityEventExampleComponent);
