/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFormRow, EuiPopover } from '@elastic/eui';

export const BulkOperationPopover: React.FunctionComponent = ({ children }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      data-test-subj="bulkAction"
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.bulkActionPopover.buttonTitle"
            defaultMessage="Manage alerts"
          />
        </EuiButton>
      }
    >
      {children &&
        React.Children.map(children, child =>
          React.isValidElement(child) ? (
            <EuiFormRow>{React.cloneElement(child, {})}</EuiFormRow>
          ) : (
            child
          )
        )}
    </EuiPopover>
  );
};
