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

const TooltipTitle = styled.div`
  font-weight: bold;
  margin-bottom: ${px(units.quarter)};
`;

const SamplingTooltip = () => (
  <TooltipWrapper>
    <OverlayTrigger
      placement="top"
      trigger="hover"
      overlay={
        <Tooltip>
          <TooltipTitle>Sampling</TooltipTitle>
          Each bucket will show a sample transaction. If there&apos;s no sample
          available,<br />
          it&apos;s most likely because of the sampling limit set in the agent
          configuration.
        </Tooltip>
      }
    >
      <EuiIcon type="questionInCircle" />
    </OverlayTrigger>
  </TooltipWrapper>
);

export default SamplingTooltip;
