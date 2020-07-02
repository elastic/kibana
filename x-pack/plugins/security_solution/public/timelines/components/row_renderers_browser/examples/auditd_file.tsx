/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { createGenericFileRowRenderer } from '../../timeline/body/renderers/auditd/generic_row_renderer';

const AuditdFileExampleComponent: React.FC = () => {
  const auditdFileRowRenderer = createGenericFileRowRenderer({
    actionName: 'opened-file',
    text: 'some text',
  });

  return (
    <>
      {auditdFileRowRenderer.renderRow({
        browserFields: {},
        data: mockTimelineData[27].ecs,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const AuditdFileExample = React.memo(AuditdFileExampleComponent);
