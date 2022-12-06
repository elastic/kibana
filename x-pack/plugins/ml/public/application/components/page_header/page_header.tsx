/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect } from 'react';
import { InPortal, OutPortal } from 'react-reverse-portal';
import { EuiLoadingContent } from '@elastic/eui';
import { MlPageControlsContext } from '../ml_page/ml_page';

/**
 * Component for setting the page header content.
 */
export const MlPageHeader: FC = ({ children }) => {
  const { headerPortal, setIsHeaderMounted } = useContext(MlPageControlsContext);

  useEffect(() => {
    setIsHeaderMounted(true);
    return () => {
      setIsHeaderMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <InPortal node={headerPortal}>{children}</InPortal>;
};

/**
 * Renders content of the {@link MlPageHeader}
 */
export const MlPageHeaderRenderer: FC = () => {
  const { headerPortal, isHeaderMounted } = useContext(MlPageControlsContext);

  return isHeaderMounted ? <OutPortal node={headerPortal} /> : <EuiLoadingContent lines={1} />;
};
