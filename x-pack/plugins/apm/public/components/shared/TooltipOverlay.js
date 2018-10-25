/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';

function TooltipOverlay({ children, content, delay = 1000 }) {
  return (
    <OverlayTrigger
      placement="top"
      trigger="hover"
      delay={delay}
      overlay={<Tooltip>{content}</Tooltip>}
    >
      {children}
    </OverlayTrigger>
  );
}

export default TooltipOverlay;
