/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, EuiNotificationBadge } from '@elastic/eui';

export const MailNavButton = () => {
  const [showBadge, setShowBadge] = useState<boolean>(true);
  function showFlyout() {
    setShowBadge(false);
  }
  return (
    <EuiHeaderSectionItemButton
      aria-controls="keyPadMenu"
      // aria-expanded={this.state.isFlyoutVisible}
      aria-haspopup="true"
      aria-label="Apps menu"
      onClick={showFlyout}
    >
      <EuiIcon type="email" size="m" />

      {showBadge ? (
        <EuiNotificationBadge className="euiHeaderNotification">&#9642;</EuiNotificationBadge>
      ) : null}
    </EuiHeaderSectionItemButton>
  );
};
