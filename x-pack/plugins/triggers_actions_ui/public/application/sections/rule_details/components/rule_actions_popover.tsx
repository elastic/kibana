/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import './rule_actions_popopver.scss';
import { Rule } from '../../../..';

export interface RuleActionsPopoverProps {
  rule: Rule;
  onRefresh: () => void;
  onDelete: (ruleId: string) => void;
  onApiKeyUpdate: (ruleId: string) => void;
}

export const RuleActionsPopover: React.FunctionComponent<RuleActionsPopoverProps> = ({
  rule,
  onRefresh,
  onDelete,
  onApiKeyUpdate,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          disabled={false}
          data-test-subj="ruleActionsButton"
          iconType="boxesHorizontal"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.popoverButtonTitle',
            { defaultMessage: 'Actions' }
          )}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      ownFocus
      panelPaddingSize="none"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [
              {
                disabled: false,
                'data-test-subj': 'refreshRulesButton',
                onClick: () => {
                  setIsPopoverOpen(false);
                  onRefresh();
                },
                name: i18n.translate(
                  'xpack.triggersActionsUI.sections.ruleDetails.refreshRulesButtonLabel',
                  { defaultMessage: 'Refresh' }
                ),
              },
              {
                disabled: false,
                'data-test-subj': 'updateAPIKeyButton',
                onClick: () => {
                  setIsPopoverOpen(false);
                  onApiKeyUpdate(rule.id);
                },
                name: i18n.translate(
                  'xpack.triggersActionsUI.sections.ruleDetails.updateAPIKeyButtonLabel',
                  { defaultMessage: 'Update API Key' }
                ),
              },
              {
                disabled: false,
                'data-test-subj': 'deleteRuleButton',
                onClick: () => {
                  onDelete(rule.id);
                  setIsPopoverOpen(false);
                },
                name: i18n.translate(
                  'xpack.triggersActionsUI.sections.ruleDetails.deleteRuleButtonLabel',
                  { defaultMessage: 'Delete rule' }
                ),
              },
            ],
          },
        ]}
        className="ruleActionsPopover"
        data-test-subj="ruleActionsPopover"
        data-testid="ruleActionsPopover"
      />
    </EuiPopover>
  );
};
