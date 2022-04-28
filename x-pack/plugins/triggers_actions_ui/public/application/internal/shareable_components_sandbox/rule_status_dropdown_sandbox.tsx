/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { RuleSnooze } from '@kbn/alerting-plugin/common';
import { getRuleStatusDropdownLazy } from '../../../common/get_rule_status_dropdown';

export const RuleStatusDropdownSandbox: React.FC<{}> = () => {
  const [enabled, setEnabled] = useState(true);
  const [snoozeSchedule, setSnoozeSchedule] = useState<RuleSnooze>([]);
  const [muteAll, setMuteAll] = useState(false);

  return getRuleStatusDropdownLazy({
    rule: {
      enabled,
      snoozeSchedule,
      muteAll,
    },
    enableRule: async () => {
      setEnabled(true);
      setMuteAll(false);
      setSnoozeSchedule([]);
    },
    disableRule: async () => setEnabled(false),
    snoozeRule: async (time) => {
      if (time === -1) {
        setSnoozeSchedule([]);
        setMuteAll(true);
      } else {
        setSnoozeSchedule([
          { startTime: new Date().toISOString(), duration: Date.parse(time) - Date.now() },
        ]);
        setMuteAll(false);
      }
    },
    unsnoozeRule: async () => {
      setMuteAll(false);
      setSnoozeSchedule([]);
    },
    onRuleChanged: () => {},
    isEditable: true,
  });
};
