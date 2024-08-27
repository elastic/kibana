/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const createExpandableFlyoutApiMock = () => ({
  closeFlyout: jest.fn(),
  closeLeftPanel: jest.fn(),
  closePreviewPanel: jest.fn(),
  closeRightPanel: jest.fn(),
  previousPreviewPanel: jest.fn(),
  openFlyout: jest.fn(),
  openLeftPanel: jest.fn(),
  openPreviewPanel: jest.fn(),
  openRightPanel: jest.fn(),
});

export const createExpandableFlyoutMock = () => {
  return {
    useExpandableFlyoutApi: jest.fn().mockReturnValue(createExpandableFlyoutApiMock()),
    useExpandableFlyoutState: jest.fn(),
    ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
    withExpandableFlyoutProvider: <T extends object>(Component: React.ComponentType<T>) => {
      return (props: T) => {
        return <Component {...props} />;
      };
    },
    ExpandableFlyout: jest.fn(),
  };
};
