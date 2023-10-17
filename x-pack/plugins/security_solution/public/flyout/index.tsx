/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import {
  ExpandableFlyout,
  type ExpandableFlyoutProps,
  ExpandableFlyoutProvider,
} from '@kbn/expandable-flyout';
import type { IsolateHostPanelProps } from './document_details/isolate_host';
import { IsolateHostPanel, IsolateHostPanelKey } from './document_details/isolate_host';
import { IsolateHostPanelProvider } from './document_details/isolate_host/context';
import type { RightPanelProps } from './document_details/right';
import { RightPanel, RightPanelKey } from './document_details/right';
import { RightPanelProvider } from './document_details/right/context';
import type { LeftPanelProps } from './document_details/left';
import { LeftPanel, LeftPanelKey } from './document_details/left';
import { LeftPanelProvider } from './document_details/left/context';
import {
  SecuritySolutionFlyoutUrlSyncProvider,
  useSecurityFlyoutUrlSync,
} from './document_details/shared/context/url_sync';
import type { PreviewPanelProps } from './document_details/preview';
import { PreviewPanel, PreviewPanelKey } from './document_details/preview';
import { PreviewPanelProvider } from './document_details/preview/context';
import { UserDetailsPanel } from './entity_details/user_details';

/**
 * List of all panels that will be used within the document details expandable flyout.
 * This needs to be passed to the expandable flyout registeredPanels property.
 */
const expandableFlyoutDocumentsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: RightPanelKey,
    component: (props) => (
      <RightPanelProvider {...(props as RightPanelProps).params}>
        <RightPanel path={props.path as RightPanelProps['path']} />
      </RightPanelProvider>
    ),
  },
  {
    key: LeftPanelKey,
    component: (props) => (
      <LeftPanelProvider {...(props as LeftPanelProps).params}>
        <LeftPanel path={props.path as LeftPanelProps['path']} />
      </LeftPanelProvider>
    ),
  },
  {
    key: PreviewPanelKey,
    component: (props) => (
      <PreviewPanelProvider {...(props as PreviewPanelProps).params}>
        <PreviewPanel path={props.path as PreviewPanelProps['path']} />
      </PreviewPanelProvider>
    ),
  },
  {
    key: IsolateHostPanelKey,
    component: (props) => (
      <IsolateHostPanelProvider {...(props as IsolateHostPanelProps).params}>
        <IsolateHostPanel path={props.path as IsolateHostPanelProps['path']} />
      </IsolateHostPanelProvider>
    ),
  },
  {
    key: 'user-details',
    component: (props) => <UserDetailsPanel {...(props as UserDetailsPanelProps).params} />,
  },
  {
    key: 'all-risk-inputs',
    component: (props) => <>{'olá'}</>,
  },
];

export interface UserDetailsPanelProps extends FlyoutPanelProps {
  key: 'user-details';
  params: {
    userName: string;
    contextID: string;
    scopeId: string;
    isDraggable: boolean;
  };
}

const OuterProviders: FC = ({ children }) => {
  return <SecuritySolutionFlyoutUrlSyncProvider>{children}</SecuritySolutionFlyoutUrlSyncProvider>;
};

const InnerProviders: FC = ({ children }) => {
  const [flyoutRef, handleFlyoutChangedOrClosed] = useSecurityFlyoutUrlSync();

  return (
    <ExpandableFlyoutProvider
      onChanges={handleFlyoutChangedOrClosed}
      onClosePanels={handleFlyoutChangedOrClosed}
      ref={flyoutRef}
    >
      {children}
    </ExpandableFlyoutProvider>
  );
};

export const SecuritySolutionFlyoutContextProvider: FC = ({ children }) => (
  <OuterProviders>
    <InnerProviders>{children}</InnerProviders>
  </OuterProviders>
);

SecuritySolutionFlyoutContextProvider.displayName = 'SecuritySolutionFlyoutContextProvider';

export const SecuritySolutionFlyout = memo(() => {
  const [_flyoutRef, handleFlyoutChangedOrClosed] = useSecurityFlyoutUrlSync();

  return (
    <ExpandableFlyout
      registeredPanels={expandableFlyoutDocumentsPanels}
      handleOnFlyoutClosed={handleFlyoutChangedOrClosed}
    />
  );
});

SecuritySolutionFlyout.displayName = 'SecuritySolutionFlyout';
