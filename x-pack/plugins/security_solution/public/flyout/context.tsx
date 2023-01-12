/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { merge } from 'lodash';
import { noop } from 'lodash/fp';
import type { SecurityFlyout, SecurityFlyoutScopes } from '../common/store/flyout/model';
import { openSecurityFlyoutByScope } from '../common/store/flyout/actions';

interface ExpandableFlyoutContext {
  closeFlyout: () => void;
  flyoutScope?: SecurityFlyoutScopes;
  flyoutPanels: SecurityFlyout;
  updateFlyoutPanels: (configUpdate: Partial<SecurityFlyout>) => void;
}

const ExpandableFlyoutContext = createContext<ExpandableFlyoutContext>({
  closeFlyout: noop,
  flyoutScope: undefined,
  flyoutPanels: {
    left: undefined,
    right: undefined,
    preview: undefined,
  },
  updateFlyoutPanels: noop,
});

interface ExpandableFlyoutProviderProps {
  closeFlyout: () => void;
  flyoutScope: SecurityFlyoutScopes;
  scopedFlyout: SecurityFlyout;
  children: React.ReactNode;
}

export const ExpandableFlyoutProvider = ({
  closeFlyout,
  flyoutScope,
  scopedFlyout,
  children,
}: ExpandableFlyoutProviderProps) => {
  const [flyoutPanels, updatePanels] = useState(scopedFlyout);
  const dispatch = useDispatch();

  const updateFlyoutPanels = useCallback(
    (panelsUpdate: Partial<SecurityFlyout>) => {
      const update = merge({}, flyoutPanels, panelsUpdate);
      dispatch(openSecurityFlyoutByScope({ flyoutScope, ...update }));
    },
    [flyoutPanels, dispatch, flyoutScope]
  );

  useEffect(() => {
    updatePanels(scopedFlyout);
  }, [scopedFlyout]);

  const contextValue = useMemo(
    () => ({
      closeFlyout,
      flyoutScope,
      flyoutPanels,
      updateFlyoutPanels,
    }),
    [closeFlyout, flyoutScope, flyoutPanels, updateFlyoutPanels]
  );

  return (
    <ExpandableFlyoutContext.Provider value={contextValue}>
      {children}
    </ExpandableFlyoutContext.Provider>
  );
};

// If there is no data, then the nothing will load
export const useExpandableFlyoutContext = () =>
  useContext<NonNullable<ExpandableFlyoutContext>>(ExpandableFlyoutContext);
