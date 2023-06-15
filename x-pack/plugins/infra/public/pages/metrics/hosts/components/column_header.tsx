/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiPopover, EuiIcon, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { MetricExplanation } from './metric_explanation';

interface Props {
  text: string;
  toolTip: string;
  formula: string;
}

export const ColumnHeader = ({ text, toolTip, formula }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = (e: React.MouseEvent<SVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPopoverOpen((value) => !value);
  };
  const closePopover = () => setIsPopoverOpen(false);

  return (
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
        {text}
      </div>

      <EuiPopover
        panelPaddingSize="s"
        button={
          <EuiIcon
            data-test-subj="infraColumnsButton"
            type="questionInCircle"
            onClick={onButtonClick}
          />
        }
        offset={10}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <MetricExplanation
          formula={formula}
          description={toolTip}
          style={{ width: 300 }}
          showDocumentationLink
        />
      </EuiPopover>
    </EuiFlexGroup>
  );
};
