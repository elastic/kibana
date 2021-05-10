/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';

import * as i18n from './translations';

export interface ErrorsPopoverProps {
  ariaLabel?: string;
  errors: string[];
}

export const ErrorsPopover: FC<ErrorsPopoverProps> = ({ ariaLabel, errors }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <EuiPopover
      data-test-subj="eql-validation-errors-popover"
      button={
        <EuiButtonEmpty
          data-test-subj="eql-validation-errors-popover-button"
          iconType="crossInACircleFilled"
          size="s"
          color="danger"
          aria-label={ariaLabel}
          onClick={handleToggle}
        >
          {errors.length}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={handleClose}
      anchorPosition="downCenter"
    >
      <div data-test-subj="eql-validation-errors-popover-content">
        <EuiPopoverTitle>{i18n.EQL_VALIDATION_ERRORS_TITLE}</EuiPopoverTitle>
        {errors.map((message, idx) => (
          <EuiText key={idx}>{message}</EuiText>
        ))}
      </div>
    </EuiPopover>
  );
};
