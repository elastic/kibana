/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import type { RuleResponse } from '../common/types';
import { CREATE_RULE_ACTION_SUBJ, TAKE_ACTION_SUBJ } from './test_subjects';
import { useKibana } from '../common/hooks/use_kibana';
import { DETECTION_ENGINE_ALERTS_KEY, DETECTION_ENGINE_RULES_KEY } from '../common/constants';

const RULE_PAGE_PATH = '/app/security/rules/id/';

interface TakeActionProps {
  createRuleFn?: (http: HttpSetup) => Promise<RuleResponse>;
  enableBenchmarkRuleFn?: () => Promise<void>;
  disableBenchmarkRuleFn?: () => Promise<void>;
}

export const showCreateDetectionRuleSuccessToast = (
  notifications: NotificationsStart,
  http: HttpSetup,
  ruleResponse: RuleResponse
) => {
  return notifications.toasts.addSuccess({
    toastLifeTimeMs: 10000,
    color: 'success',
    iconType: '',
    'data-test-subj': 'csp:toast-success',
    text: toMountPoint(
      <div>
        <EuiText size="m">
          <strong data-test-subj="csp:toast-success-title">{ruleResponse.name}</strong>
          {` `}
          <FormattedMessage
            id="xpack.csp.flyout.ruleCreatedToastTitle"
            defaultMessage="detection rule was created."
          />
        </EuiText>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.csp.flyout.ruleCreatedToast"
            defaultMessage="Add rule actions to get notified when alerts are generated."
          />
        </EuiText>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="csp:toast-success-link"
              size="s"
              href={http.basePath.prepend(RULE_PAGE_PATH + ruleResponse.id)}
            >
              <FormattedMessage
                id="xpack.csp.flyout.ruleCreatedToastViewRuleButton"
                defaultMessage="View rule"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    ),
  });
};

export const showChangeBenchmarkRuleStatesSuccessToast = (
  notifications: NotificationsStart,
  isBenchmarkRuleMuted: boolean
) => {
  return notifications.toasts.addSuccess({
    toastLifeTimeMs: 10000,
    color: 'success',
    iconType: '',
    'data-test-subj': 'csp:toast-success-rule-state-change',
    text: toMountPoint(
      <div>
        <EuiText size="m">
          {isBenchmarkRuleMuted ? (
            <>
              <EuiText size="m">
                <strong data-test-subj="csp:toast-success-enable-rule-title">
                  <FormattedMessage
                    id="xpack.csp.flyout.ruleEnabledToastTitle"
                    defaultMessage="Rule Enabled"
                  />
                </strong>
              </EuiText>
              <FormattedMessage
                id="xpack.csp.flyout.ruleEnabledToast"
                defaultMessage="Successfully enabled rule"
              />
            </>
          ) : (
            <>
              <EuiText size="m">
                <strong data-test-subj="csp:toast-success-disable-rule-title">
                  <FormattedMessage
                    id="xpack.csp.flyout.ruleDisabledToastTitle"
                    defaultMessage="Rule Disabled"
                  />
                </strong>
              </EuiText>
              <FormattedMessage
                id="xpack.csp.flyout.ruleDisabledToast"
                defaultMessage="Successfully disabled rule"
              />
            </>
          )}
        </EuiText>
      </div>
    ),
  });
};

/*
 * This component is used to create a detection rule from Flyout.
 * It accepts a createRuleFn parameter which is used to create a rule in a generic way.
 */
export const TakeAction = ({
  createRuleFn,
  enableBenchmarkRuleFn,
  disableBenchmarkRuleFn,
}: TakeActionProps) => {
  const queryClient = useQueryClient();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const closePopover = () => {
    setPopoverOpen(false);
  };

  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const { http, notifications } = useKibana().services;

  const button = (
    <EuiButton
      isLoading={isLoading}
      fill
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    >
      <FormattedMessage id="xpack.csp.flyout.takeActionButton" defaultMessage="Take action" />
    </EuiButton>
  );
  const actionsItems = [];

  if (createRuleFn)
    actionsItems.push(
      <CreateDetectionRule
        key="createRule"
        createRuleFn={createRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
        notifications={notifications}
        http={http}
        queryClient={queryClient}
      />
    );
  if (enableBenchmarkRuleFn)
    actionsItems.push(
      <EnableBenchmarkRule
        key="enableBenchmarkRule"
        enableBenchmarkRuleFn={enableBenchmarkRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
        notifications={notifications}
        http={http}
        queryClient={queryClient}
      />
    );
  if (disableBenchmarkRuleFn)
    actionsItems.push(
      <DisableBenchmarkRule
        key="disableBenchmarkRule"
        disableBenchmarkRuleFn={disableBenchmarkRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
        notifications={notifications}
        http={http}
        queryClient={queryClient}
      />
    );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj={TAKE_ACTION_SUBJ}
    >
      <EuiContextMenuPanel size="s" items={actionsItems} />
    </EuiPopover>
  );
};

const CreateDetectionRule = ({
  createRuleFn,
  setIsLoading,
  closePopover,
  notifications,
  http,
  queryClient,
}: {
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
  notifications: NotificationsStart;
  http: HttpSetup;
  queryClient: QueryClient;
}) => {
  return (
    <EuiContextMenuItem
      key="createRule"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        const ruleResponse = await createRuleFn(http);
        setIsLoading(false);
        showCreateDetectionRuleSuccessToast(notifications, http, ruleResponse);
        // Triggering a refetch of rules and alerts to update the UI
        queryClient.invalidateQueries([DETECTION_ENGINE_RULES_KEY]);
        queryClient.invalidateQueries([DETECTION_ENGINE_ALERTS_KEY]);
      }}
      data-test-subj={CREATE_RULE_ACTION_SUBJ}
    >
      <FormattedMessage
        defaultMessage="Create a detection rule"
        id="xpack.csp.createDetectionRuleButton"
      />
    </EuiContextMenuItem>
  );
};

const EnableBenchmarkRule = ({
  enableBenchmarkRuleFn,
  setIsLoading,
  closePopover,
  notifications,
}: {
  enableBenchmarkRuleFn: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
  notifications: NotificationsStart;
  http: HttpSetup;
  queryClient: QueryClient;
}) => {
  return (
    <EuiContextMenuItem
      key="enableBenchmarkRule"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        await enableBenchmarkRuleFn();
        setIsLoading(false);
      }}
      data-test-subj={'enable-benchmark-rule-take-action-button'}
    >
      <FormattedMessage defaultMessage="Enable Rule" id="xpack.csp.enableBenchmarkRuleButton" />
    </EuiContextMenuItem>
  );
};

const DisableBenchmarkRule = ({
  disableBenchmarkRuleFn,
  setIsLoading,
  closePopover,
  notifications,
}: {
  disableBenchmarkRuleFn: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
  notifications: NotificationsStart;
  http: HttpSetup;
  queryClient: QueryClient;
}) => {
  return (
    <EuiContextMenuItem
      key="disableBenchmarkRule"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        await disableBenchmarkRuleFn();
        setIsLoading(false);
      }}
      data-test-subj={'disable-benchmark-rule-take-action-button'}
    >
      <FormattedMessage defaultMessage="Disable Rule" id="xpack.csp.disableBenchmarkRuleButton" />
    </EuiContextMenuItem>
  );
};
