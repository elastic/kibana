/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
import {
  ExpandableFlyout,
  type ExpandableFlyoutProps,
  ExpandableFlyoutProvider,
} from '@kbn/expandable-flyout';
import type { IsolateHostPanelProps } from './document_details/isolate_host';
import {
  IsolateHostPanel,
  DocumentDetailsIsolateHostPanelKey,
} from './document_details/isolate_host';
import { IsolateHostPanelProvider } from './document_details/isolate_host/context';
import type { RightPanelProps } from './document_details/right';
import { RightPanel, DocumentDetailsRightPanelKey } from './document_details/right';
import { RightPanelProvider } from './document_details/right/context';
import type { LeftPanelProps } from './document_details/left';
import { LeftPanel, DocumentDetailsLeftPanelKey } from './document_details/left';
import { LeftPanelProvider } from './document_details/left/context';
import type { PreviewPanelProps } from './document_details/preview';
import { PreviewPanel, DocumentDetailsPreviewPanelKey } from './document_details/preview';
import { PreviewPanelProvider } from './document_details/preview/context';
import type { UserPanelExpandableFlyoutProps } from './entity_details/user_right';
import { UserPanel, UserPanelKey } from './entity_details/user_right';
import type { RiskInputsExpandableFlyoutProps } from './entity_details/risk_inputs_left';
import { RiskInputsPanel, RiskInputsPanelKey } from './entity_details/risk_inputs_left';
/**
 * List of all panels that will be used within the document details expandable flyout.
 * This needs to be passed to the expandable flyout registeredPanels property.
 */
const expandableFlyoutDocumentsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: DocumentDetailsRightPanelKey,
    component: (props) => (
      <RightPanelProvider {...(props as RightPanelProps).params}>
        <RightPanel path={props.path as RightPanelProps['path']} />
      </RightPanelProvider>
    ),
  },
  {
    key: DocumentDetailsLeftPanelKey,
    component: (props) => (
      <LeftPanelProvider {...(props as LeftPanelProps).params}>
        <LeftPanel path={props.path as LeftPanelProps['path']} />
      </LeftPanelProvider>
    ),
  },
  {
    key: DocumentDetailsPreviewPanelKey,
    component: (props) => (
      <PreviewPanelProvider {...(props as PreviewPanelProps).params}>
        <PreviewPanel path={props.path as PreviewPanelProps['path']} />
      </PreviewPanelProvider>
    ),
  },
  {
    key: DocumentDetailsIsolateHostPanelKey,
    component: (props) => (
      <IsolateHostPanelProvider {...(props as IsolateHostPanelProps).params}>
        <IsolateHostPanel path={props.path as IsolateHostPanelProps['path']} />
      </IsolateHostPanelProvider>
    ),
  },
  {
    key: UserPanelKey,
    component: (props) => <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} />,
  },
  {
    key: RiskInputsPanelKey,
    component: (props) => (
      <RiskInputsPanel {...(props as RiskInputsExpandableFlyoutProps).params} />
    ),
  },
];

// NOTE: provider below accepts "storage" prop, please take a look into component's JSDoc.
export const SecuritySolutionFlyoutContextProvider: FC = ({ children }) => (
  <ExpandableFlyoutProvider storage="url">{children}</ExpandableFlyoutProvider>
);

SecuritySolutionFlyoutContextProvider.displayName = 'SecuritySolutionFlyoutContextProvider';

export const SecuritySolutionFlyout = memo(() => (
  <ExpandableFlyout registeredPanels={expandableFlyoutDocumentsPanels} paddingSize="none" />
));

SecuritySolutionFlyout.displayName = 'SecuritySolutionFlyout';
