/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { getRuleStatusDropdownLazy } from '../../../common/get_rule_status_dropdown';

export const RuleStatusDropdownSandbox: React.FC<{}> = () => {
  const [enabled, setEnabled] = useState(true);
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const [muteAll, setMuteAll] = useState(false);

  return getRuleStatusDropdownLazy({
    rule: {
      enabled,
      snoozeEndTime,
      muteAll,
    },
    enableRule: async () => {
      setEnabled(true);
      setMuteAll(false);
      setSnoozeEndTime(null);
    },
    disableRule: async () => setEnabled(false),
    snoozeRule: async (time) => {
      if (time === -1) {
        setSnoozeEndTime(null);
        setMuteAll(true);
      } else {
        setSnoozeEndTime(new Date(time));
        setMuteAll(false);
      }
    },
    unsnoozeRule: async () => {
      setMuteAll(false);
      setSnoozeEndTime(null);
    },
    onRuleChanged: () => {},
    isEditable: true,
  });
};
