/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useMemo } from 'react';
import { createPortalNode, InPortal } from 'react-reverse-portal';
import { MlPageControlsContext } from '../ml_page/ml_page';

export const MlPageHeader: FC = ({ children }) => {
  const { setPageTitle } = useContext(MlPageControlsContext);

  const portalNode = useMemo(() => createPortalNode(), []);

  useEffect(() => {
    setPageTitle(children);

    return () => {
      portalNode.unmount();
      setPageTitle(undefined);
    };
  }, [portalNode, setPageTitle]);

  return <InPortal node={portalNode}>{children}</InPortal>;
};
