/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export const AlertsDropdown = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopoverVisibility = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const button = (
    <EuiButtonEmpty iconSide={'right'} iconType={'arrowDown'} onClick={togglePopoverVisibility}>
      <FormattedMessage id="xpack.monitoring.alerts.dropdown.button" defaultMessage="Alerts" />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiContextMenuPanel>Alerts dropdown content</EuiContextMenuPanel>
    </EuiPopover>
  );
};
