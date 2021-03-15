/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiCode, EuiPopover, EuiText } from '@elastic/eui';

interface Props {
  seriesId: string;
}
export const DefaultFilters = ({ seriesId }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonEmpty
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      color="text"
    >
      Default filters
    </EuiButtonEmpty>
  );

  const jsCodeCode = `query: { match_phrase: { 'transaction.type': 'page-load' } }`;

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText style={{ width: 300 }}>
        <EuiCode language="javascript" transparentBackground>
          {jsCodeCode.trim()}
        </EuiCode>
      </EuiText>
    </EuiPopover>
  );
};
