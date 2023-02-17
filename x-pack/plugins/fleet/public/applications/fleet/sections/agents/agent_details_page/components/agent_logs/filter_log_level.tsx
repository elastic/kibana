/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback } from 'react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AGENT_LOG_LEVELS } from './constants';

const LEVEL_VALUES = Object.values(AGENT_LOG_LEVELS);

export const LogLevelFilter: React.FunctionComponent<{
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
}> = memo(({ selectedLevels, onToggleLevel }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const filterSelect = LEVEL_VALUES.map((level) => (
    <EuiFilterSelectItem
      checked={selectedLevels.includes(level) ? 'on' : undefined}
      key={level}
      onClick={() => onToggleLevel(level)}
    >
      {level}
    </EuiFilterSelectItem>
  ));

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          data-test-subj="agentList.logLevelFilterBtn"
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          numFilters={LEVEL_VALUES.length}
          hasActiveFilters={selectedLevels.length > 0}
          numActiveFilters={selectedLevels.length}
        >
          {i18n.translate('xpack.fleet.agentLogs.logLevelSelectText', {
            defaultMessage: 'Log level',
          })}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      {filterSelect}
    </EuiPopover>
  );
});
