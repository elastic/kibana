/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { createGenericFileRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';

const SystemFileExampleComponent: React.FC = () => {
  const systemFileRowRenderer = createGenericFileRowRenderer({
    actionName: 'user_login',
    text: 'some text',
  });

  return (
    <>
      {systemFileRowRenderer.renderRow({
        browserFields: {},
        data: mockTimelineData[28].ecs,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemFileExample = React.memo(SystemFileExampleComponent);
