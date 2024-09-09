/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { ExpandableFlyout, type ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import { useEuiTheme } from '@elastic/eui';
import type { NetworkExpandableFlyoutProps } from './network_details';
import { Flyouts } from './document_details/shared/constants/flyouts';
import {
  DocumentDetailsIsolateHostPanelKey,
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
  DocumentDetailsPreviewPanelKey,
  DocumentDetailsAlertReasonPanelKey,
  DocumentDetailsRuleOverviewPanelKey,
} from './document_details/shared/constants/panel_keys';
import type { IsolateHostPanelProps } from './document_details/isolate_host';
import { IsolateHostPanel } from './document_details/isolate_host';
import { IsolateHostPanelProvider } from './document_details/isolate_host/context';
import type { DocumentDetailsProps } from './document_details/shared/types';
import { DocumentDetailsProvider } from './document_details/shared/context';
import { RightPanel } from './document_details/right';
import { LeftPanel } from './document_details/left';
import { PreviewPanel } from './document_details/preview';
import type { AlertReasonPanelProps } from './document_details/alert_reason';
import { AlertReasonPanel } from './document_details/alert_reason';
import { AlertReasonPanelProvider } from './document_details/alert_reason/context';
import type { RuleOverviewPanelProps } from './document_details/rule_overview';
import { RuleOverviewPanel } from './document_details/rule_overview';
import { RuleOverviewPanelProvider } from './document_details/rule_overview/context';
import type { UserPanelExpandableFlyoutProps } from './entity_details/user_right';
import { UserPanel, UserPanelKey, UserPreviewPanelKey } from './entity_details/user_right';
import type { UserDetailsPanelProps } from './entity_details/user_details_left';
import { UserDetailsPanel, UserDetailsPanelKey } from './entity_details/user_details_left';
import type { HostPanelExpandableFlyoutProps } from './entity_details/host_right';
import { HostPanel, HostPanelKey, HostPreviewPanelKey } from './entity_details/host_right';
import type { HostDetailsExpandableFlyoutProps } from './entity_details/host_details_left';
import { HostDetailsPanel, HostDetailsPanelKey } from './entity_details/host_details_left';
import { NetworkPanel, NetworkPanelKey } from './network_details';

/**
 * List of all panels that will be used within the document details expandable flyout.
 * This needs to be passed to the expandable flyout registeredPanels property.
 */
const expandableFlyoutDocumentsPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: DocumentDetailsRightPanelKey,
    component: (props) => (
      <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
        <RightPanel path={props.path as DocumentDetailsProps['path']} />
      </DocumentDetailsProvider>
    ),
  },
  {
    key: DocumentDetailsLeftPanelKey,
    component: (props) => (
      <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
        <LeftPanel path={props.path as DocumentDetailsProps['path']} />
      </DocumentDetailsProvider>
    ),
  },
  {
    key: DocumentDetailsPreviewPanelKey,
    component: (props) => (
      <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
        <PreviewPanel path={props.path as DocumentDetailsProps['path']} />
      </DocumentDetailsProvider>
    ),
  },
  {
    key: DocumentDetailsAlertReasonPanelKey,
    component: (props) => (
      <AlertReasonPanelProvider {...(props as AlertReasonPanelProps).params}>
        <AlertReasonPanel />
      </AlertReasonPanelProvider>
    ),
  },
  {
    key: DocumentDetailsRuleOverviewPanelKey,
    component: (props) => (
      <RuleOverviewPanelProvider {...(props as RuleOverviewPanelProps).params}>
        <RuleOverviewPanel />
      </RuleOverviewPanelProvider>
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
    key: UserDetailsPanelKey,
    component: (props) => (
      <UserDetailsPanel {...({ ...props.params, path: props.path } as UserDetailsPanelProps)} />
    ),
  },
  {
    key: UserPreviewPanelKey,
    component: (props) => (
      <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} isPreviewMode />
    ),
  },
  {
    key: HostPanelKey,
    component: (props) => <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} />,
  },
  {
    key: HostDetailsPanelKey,
    component: (props) => (
      <HostDetailsPanel {...(props as HostDetailsExpandableFlyoutProps).params} />
    ),
  },
  {
    key: HostPreviewPanelKey,
    component: (props) => (
      <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} isPreviewMode />
    ),
  },
  {
    key: NetworkPanelKey,
    component: (props) => <NetworkPanel {...(props as NetworkExpandableFlyoutProps).params} />,
  },
];

export const SECURITY_SOLUTION_ON_CLOSE_EVENT = `expandable-flyout-on-close-${Flyouts.securitySolution}`;
export const TIMELINE_ON_CLOSE_EVENT = `expandable-flyout-on-close-${Flyouts.timeline}`;

/**
 * Flyout used for the Security Solution application
 * We keep the default EUI 1000 z-index to ensure it is always rendered behind Timeline (which has a z-index of 1001)
 * We propagate the onClose callback to the rest of Security Solution using a window event 'expandable-flyout-on-close-SecuritySolution'
 * This flyout support push/overlay mode. The value is saved in local storage.
 */
export const SecuritySolutionFlyout = memo(() => {
  const onClose = useCallback(
    () =>
      window.dispatchEvent(
        new CustomEvent(SECURITY_SOLUTION_ON_CLOSE_EVENT, {
          detail: Flyouts.securitySolution,
        })
      ),
    []
  );

  return (
    <ExpandableFlyout
      registeredPanels={expandableFlyoutDocumentsPanels}
      paddingSize="none"
      onClose={onClose}
    />
  );
});

SecuritySolutionFlyout.displayName = 'SecuritySolutionFlyout';

/**
 * Flyout used in Timeline
 * We set the z-index to 1002 to ensure it is always rendered above Timeline (which has a z-index of 1001)
 * We propagate the onClose callback to the rest of Security Solution using a window event 'expandable-flyout-on-close-Timeline'
 * This flyout does not support push mode, because timeline being rendered in a modal (EUiPortal), it's very difficult to dynamically change its width.
 */
export const TimelineFlyout = memo(() => {
  const { euiTheme } = useEuiTheme();

  const onClose = useCallback(
    () =>
      window.dispatchEvent(
        new CustomEvent(TIMELINE_ON_CLOSE_EVENT, {
          detail: Flyouts.timeline,
        })
      ),
    []
  );

  return (
    <ExpandableFlyout
      registeredPanels={expandableFlyoutDocumentsPanels}
      paddingSize="none"
      customStyles={{ 'z-index': (euiTheme.levels.flyout as number) + 2 }}
      onClose={onClose}
      flyoutCustomProps={{
        pushVsOverlay: {
          disabled: true,
          tooltip: 'Push mode is not supported in Timeline',
        },
      }}
    />
  );
});

TimelineFlyout.displayName = 'TimelineFlyout';
