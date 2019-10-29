/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, EuiNotificationBadge } from '@elastic/eui';
import { NewsfeedFlyout } from './flyout_list';

export const NewsfeedContext = React.createContext({} as any);

export const MailNavButton = () => {
  const [showBadge, setShowBadge] = useState<boolean>(true);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  function showFlyout() {
    setShowBadge(false);
    setFlyoutVisible(!flyoutVisible);
  }
  let flyout;
  if (flyoutVisible) {
    flyout = <NewsfeedFlyout />;
  }
  return (
    <NewsfeedContext.Provider value={{ setFlyoutVisible }}>
      <Fragment>
        <EuiHeaderSectionItemButton
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label="Apps menu"
          onClick={showFlyout}
        >
          <EuiIcon type="email" size="m" />

          {showBadge ? (
            <EuiNotificationBadge className="euiHeaderNotification">&#9642;</EuiNotificationBadge>
          ) : null}
        </EuiHeaderSectionItemButton>
        {flyout}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
