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
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { CREATE_RULE_ACTION_SUBJ, TAKE_ACTION_SUBJ } from './test_subjects';
import { useKibana } from '../common/hooks/use_kibana';

const RULE_PAGE_PATH = '/app/security/rules/id/';

interface TakeActionProps {
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
}
/*
 * This component is used to create a detection rule from Flyout.
 * It accepts a createRuleFn parameter which is used to create a rule in a generic way.
 */
export const TakeAction = ({ createRuleFn }: TakeActionProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const closePopover = () => {
    setPopoverOpen(false);
  };

  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const { http, notifications } = useKibana().services;

  const showSuccessToast = (ruleResponse: RuleResponse) => {
    return notifications.toasts.addSuccess({
      toastLifeTimeMs: 10000,
      color: 'success',
      iconType: '',
      text: toMountPoint(
        <div>
          <EuiText size="m">
            <strong>{ruleResponse.name}</strong>
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
              <EuiButton size="s" href={http.basePath.prepend(RULE_PAGE_PATH + ruleResponse.id)}>
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
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="createRule"
            onClick={async () => {
              closePopover();
              setIsLoading(true);
              const ruleResponse = await createRuleFn(http);
              setIsLoading(false);
              showSuccessToast(ruleResponse);
            }}
            data-test-subj={CREATE_RULE_ACTION_SUBJ}
          >
            <FormattedMessage
              defaultMessage="Create a detection rule"
              id="xpack.csp.createDetectionRuleButton"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
