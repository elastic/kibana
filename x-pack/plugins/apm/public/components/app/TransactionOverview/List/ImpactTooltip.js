/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { units, px } from '../../../../style/variables';
import { EuiIcon } from '@elastic/eui';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';

const TooltipWrapper = styled.div`
  margin-left: ${px(units.half)};
`;

const ImpactTooltip = () => (
  <TooltipWrapper>
    <OverlayTrigger
      placement="top"
      trigger="hover"
      overlay={
        <Tooltip>
          Impact shows the most used and<br />slowest endpoints in your service.
        </Tooltip>
      }
    >
      <EuiIcon type="questionInCircle" />
    </OverlayTrigger>
  </TooltipWrapper>
);

export default ImpactTooltip;
