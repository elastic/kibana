/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { mockTimelineData } from '../../../../common/mock/mock_timeline_data';
import { createGenericAuditRowRenderer } from '../../timeline/body/renderers/auditd/generic_row_renderer';

const AuditdExampleComponent: React.FC = () => {
  const auditdRowRenderer = createGenericAuditRowRenderer({
    actionName: 'connected-to',
    text: 'connected using',
  });

  return (
    <>
      {auditdRowRenderer.renderRow({
        browserFields: {},
        data: mockTimelineData[26].ecs,
        timelineId: 'row-renderer-example',
      })}
    </>
  );
};
export const AuditdExample = React.memo(AuditdExampleComponent);
