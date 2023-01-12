/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { flyoutsSelector } from '../common/store/flyout/selectors';
import { closeSecurityFlyoutByScope } from '../common/store/flyout/actions';
import type { SecurityFlyoutScopes } from '../common/store/flyout/model';
import { ExpandableFlyoutProvider } from './context';
import { ExpandableFlyout } from '../common/components/expandable_flyout';
import { expandableFlyoutPanels } from './event/panels';

interface SecurityFlyoutProps {
  className?: string;
  flyoutScope: SecurityFlyoutScopes;
  handleOnFlyoutClosed?: () => void;
}

/**
 * This flyout is launched from both the primary security pages as well as the timeline.
 */
export const SecurityFlyout = React.memo(
  ({ flyoutScope, handleOnFlyoutClosed, className }: SecurityFlyoutProps) => {
    const dispatch = useDispatch();
    const flyouts = useSelector(flyoutsSelector);

    const scopedFlyout = useMemo(() => flyouts[flyoutScope], [flyoutScope, flyouts]);

    const closeFlyout = useCallback(() => {
      if (handleOnFlyoutClosed) handleOnFlyoutClosed();
      dispatch(closeSecurityFlyoutByScope({ flyoutScope }));
    }, [dispatch, flyoutScope, handleOnFlyoutClosed]);

    if (!scopedFlyout) return null;

    return (
      <ExpandableFlyoutProvider
        flyoutScope={flyoutScope}
        closeFlyout={closeFlyout}
        scopedFlyout={scopedFlyout}
      >
        <ExpandableFlyout
          className={className}
          onClose={closeFlyout}
          panels={expandableFlyoutPanels}
        />
      </ExpandableFlyoutProvider>
    );
  }
);

SecurityFlyout.displayName = 'SecurityFlyout';
