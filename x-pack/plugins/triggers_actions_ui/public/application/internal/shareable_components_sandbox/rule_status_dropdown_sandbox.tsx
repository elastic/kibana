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
  const [isSnoozedUntil, setIsSnoozedUntil] = useState<Date | null>(null);
  const [muteAll, setMuteAll] = useState(false);

  return getRuleStatusDropdownLazy({
    rule: {
      enabled,
      isSnoozedUntil,
      muteAll,
    },
    enableRule: async () => {
      setEnabled(true);
      setMuteAll(false);
      setIsSnoozedUntil(null);
    },
    disableRule: async () => setEnabled(false),
    snoozeRule: async (time) => {
      if (time === -1) {
        setIsSnoozedUntil(null);
        setMuteAll(true);
      } else {
        setIsSnoozedUntil(new Date(time));
        setMuteAll(false);
      }
    },
    unsnoozeRule: async () => {
      setMuteAll(false);
      setIsSnoozedUntil(null);
    },
    onRuleChanged: () => {},
    isEditable: true,
  });
};
