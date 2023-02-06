/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiModal, EuiModalBody, EuiSpacer } from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { snoozeRule, unsnoozeRule } from '../../../lib/rule_api';
import {
  SNOOZE_FAILED_MESSAGE,
  SNOOZE_SUCCESS_MESSAGE,
  UNSNOOZE_SUCCESS_MESSAGE,
} from './rules_list_notify_badge';
import { SnoozePanel, futureTimeToInterval } from './rule_snooze';
import { Rule, RuleTypeParams, SnoozeSchedule } from '../../../../types';

export interface RuleSnoozeModalProps {
  rule: Rule<RuleTypeParams>;
  onClose: () => void;
  onLoading: (isLoading: boolean) => void;
  onRuleChanged: () => void;
}

const isRuleSnoozed = (rule: { isSnoozedUntil?: Date | null; muteAll: boolean }) =>
  Boolean(
    (rule.isSnoozedUntil && new Date(rule.isSnoozedUntil).getTime() > Date.now()) || rule.muteAll
  );

export const RuleSnoozeModal: React.FunctionComponent<RuleSnoozeModalProps> = ({
  rule,
  onClose,
  onLoading,
  onRuleChanged,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const isSnoozed = useMemo(() => {
    return isRuleSnoozed(rule);
  }, [rule]);

  const onApplySnooze = useCallback(
    async (snoozeSchedule: SnoozeSchedule) => {
      try {
        onLoading(true);
        onClose();

        await snoozeRule({ http, id: rule.id, snoozeSchedule });

        onRuleChanged();

        toasts.addSuccess(SNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
      }
    },
    [onLoading, onClose, http, rule.id, onRuleChanged, toasts]
  );

  const onApplyUnsnooze = useCallback(
    async (scheduleIds?: string[]) => {
      try {
        onLoading(true);
        onClose();
        await unsnoozeRule({ http, id: rule.id, scheduleIds });
        onRuleChanged();
        toasts.addSuccess(UNSNOOZE_SUCCESS_MESSAGE);
      } catch (e) {
        toasts.addDanger(SNOOZE_FAILED_MESSAGE);
      } finally {
        onLoading(false);
      }
    },
    [onLoading, onClose, http, rule.id, onRuleChanged, toasts]
  );

  return (
    <EuiModal onClose={onClose} data-test-subj="ruleSnoozeModal">
      <EuiModalBody>
        <EuiSpacer size="s" />
        <SnoozePanel
          inPopover={false}
          interval={futureTimeToInterval(rule.isSnoozedUntil)}
          activeSnoozes={rule.activeSnoozes ?? []}
          scheduledSnoozes={rule.snoozeSchedule ?? []}
          showCancel={isSnoozed}
          snoozeRule={onApplySnooze}
          unsnoozeRule={onApplyUnsnooze}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleSnoozeModal as default };
