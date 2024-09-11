/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { TooltipContent } from './tooltip_content';
import { Popover } from './popover';

interface Props {
  label: string;
  toolTip?: ReactElement | string;
  formula?: string;
}

export const ColumnHeader = React.memo(({ label, toolTip, formula }: Props) => (
  <EuiFlexGroup gutterSize="xs">
    <div
      css={css`
        overflow-wrap: break-word !important;
        word-break: break-word;
        min-width: 0;
        text-overflow: ellipsis;
        overflow: hidden;
      `}
    >
      {label}
    </div>

    {toolTip && (
      <Popover>
        <TooltipContent formula={formula} description={toolTip} />
      </Popover>
    )}
  </EuiFlexGroup>
));
