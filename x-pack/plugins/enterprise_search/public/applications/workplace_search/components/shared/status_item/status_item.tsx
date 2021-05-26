/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiCopy,
  EuiButton,
  EuiButtonIcon,
  EuiToolTip,
  EuiSpacer,
  EuiCodeBlock,
  EuiPopover,
} from '@elastic/eui';

import { COPY_TEXT, STATUS_POPOVER_TOOLTIP } from '../../../constants';

interface StatusItemProps {
  details: string[];
}

export const StatusItem: React.FC<StatusItemProps> = ({ details }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  const formattedDetails = details.join('\n');

  const tooltipPopoverTrigger = (
    <EuiToolTip position="top" content={STATUS_POPOVER_TOOLTIP}>
      <EuiButtonIcon
        onClick={onButtonClick}
        color="text"
        iconType="questionInCircle"
        aria-label={STATUS_POPOVER_TOOLTIP}
      />
    </EuiToolTip>
  );

  const infoPopover = (
    <EuiPopover button={tooltipPopoverTrigger} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiCodeBlock
        language="cmd"
        fontSize="m"
        paddingSize="m"
        style={{ maxWidth: 300 }}
        isCopyable
      >
        {formattedDetails}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiCopy textToCopy={formattedDetails}>
        {(copy) => (
          <EuiButton size="s" iconType="copy" onClick={copy}>
            {COPY_TEXT}
          </EuiButton>
        )}
      </EuiCopy>
    </EuiPopover>
  );

  return infoPopover;
};
