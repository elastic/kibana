/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { createDnsRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { mockEndgameDnsRequest } from '../../../../common/mock/mock_endgame_ecs_data';

const SystemDnsExampleComponent: React.FC = () => {
  const systemDnsRowRenderer = createDnsRowRenderer();

  return (
    <>
      {systemDnsRowRenderer.renderRow({
        browserFields: {},
        data: mockEndgameDnsRequest,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const SystemDnsExample = React.memo(SystemDnsExampleComponent);
