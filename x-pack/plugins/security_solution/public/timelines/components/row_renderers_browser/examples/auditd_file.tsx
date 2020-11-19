/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { createGenericFileRowRenderer } from '../../timeline/body/renderers/auditd/generic_row_renderer';
import { OPENED_FILE, USING } from '../../timeline/body/renderers/auditd/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const AuditdFileExampleComponent: React.FC = () => {
  const auditdFileRowRenderer = createGenericFileRowRenderer({
    actionName: 'opened-file',
    text: `${OPENED_FILE} ${USING}`,
  });

  return (
    <>
      {auditdFileRowRenderer.renderRow({
        browserFields: {},
        data: mockTimelineData[27].ecs,
        timelineId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const AuditdFileExample = React.memo(AuditdFileExampleComponent);
