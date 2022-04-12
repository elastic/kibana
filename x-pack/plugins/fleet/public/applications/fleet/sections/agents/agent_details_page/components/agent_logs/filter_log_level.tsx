/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../../hooks';

import { ORDERED_FILTER_LOG_LEVELS, AGENT_LOG_INDEX_PATTERN, LOG_LEVEL_FIELD } from './constants';

function sortLogLevels(levels: string[]): string[] {
  return [
    ...new Set([
      // order by severity for known level
      ...ORDERED_FILTER_LOG_LEVELS.filter((level) => levels.includes(level)),
      // Add unknown log level
      ...levels.sort(),
    ]),
  ];
}

export const LogLevelFilter: React.FunctionComponent<{
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
}> = memo(({ selectedLevels, onToggleLevel }) => {
  const { unifiedSearch } = useStartServices();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [levelValues, setLevelValues] = useState<string[]>([]);

  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const fetchValues = async () => {
      setIsLoading(true);
      try {
        const values: string[] = await unifiedSearch.autocomplete.getValueSuggestions({
          indexPattern: {
            title: AGENT_LOG_INDEX_PATTERN,
            fields: [LOG_LEVEL_FIELD],
          },
          field: LOG_LEVEL_FIELD,
          query: '',
        });
        setLevelValues(sortLogLevels(values));
      } catch (e) {
        setLevelValues([]);
      }
      setIsLoading(false);
    };
    fetchValues();
  }, [unifiedSearch.autocomplete]);

  const noLogsFound = (
    <div className="euiFilterSelect__note">
      <div className="euiFilterSelect__noteContent">
        <EuiIcon type="minusInCircle" />
        <EuiSpacer size="xs" />
        <p>
          {i18n.translate('xpack.fleet.agentLogs.logLevelEmpty', {
            defaultMessage: 'No Logs Found',
          })}
        </p>
      </div>
    </div>
  );
  const filterSelect = levelValues.map((level) => (
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
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          isLoading={isLoading}
          numFilters={levelValues.length}
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
      {levelValues.length === 0 ? noLogsFound : filterSelect}
    </EuiPopover>
  );
});
