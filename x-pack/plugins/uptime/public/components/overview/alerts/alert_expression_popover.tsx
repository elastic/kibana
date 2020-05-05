/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';

interface AlertExpressionPopoverProps {
  'aria-label': string;
  content: React.ReactElement;
  description: string;
  'data-test-subj': string;
  id: string;
  value: string;
}

export const AlertExpressionPopover: React.FC<AlertExpressionPopoverProps> = ({
  'aria-label': ariaLabel,
  content,
  'data-test-subj': dataTestSubj,
  description,
  id,
  value,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <EuiPopover
      id={id}
      anchorPosition="downLeft"
      button={
        <EuiExpression
          aria-label={ariaLabel}
          color={isOpen ? 'primary' : 'secondary'}
          data-test-subj={dataTestSubj}
          description={description}
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          value={value}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      {content}
    </EuiPopover>
  );
};
