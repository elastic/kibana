/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { createGenericSystemRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';

const SystemExampleComponent: React.FC = () => {
  const systemRowRenderer = createGenericSystemRowRenderer({
    actionName: 'process_started',
    text: 'some text',
  });

  return (
    <>
      {systemRowRenderer.renderRow({
        browserFields: {},
        data: mockTimelineData[29].ecs,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemExample = React.memo(SystemExampleComponent);
