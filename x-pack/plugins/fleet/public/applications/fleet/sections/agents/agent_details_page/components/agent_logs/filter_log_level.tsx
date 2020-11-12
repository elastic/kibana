/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStartServices } from '../../../../../hooks';
import { AGENT_LOG_INDEX_PATTERN, LOG_LEVEL_FIELD } from './constants';

export const LogLevelFilter: React.FunctionComponent<{
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
}> = memo(({ selectedLevels, onToggleLevel }) => {
  const { data } = useStartServices();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [levelValues, setLevelValues] = useState<string[]>([]);

  useEffect(() => {
    const fetchValues = async () => {
      setIsLoading(true);
      try {
        const values = await data.autocomplete.getValueSuggestions({
          indexPattern: {
            title: AGENT_LOG_INDEX_PATTERN,
            fields: [LOG_LEVEL_FIELD],
          },
          field: LOG_LEVEL_FIELD,
          query: '',
        });
        setLevelValues(values.sort());
      } catch (e) {
        setLevelValues([]);
      }
      setIsLoading(false);
    };
    fetchValues();
  }, [data.autocomplete]);

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen(true)}
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
      closePopover={() => setIsOpen(false)}
    >
      {levelValues.map((level) => (
        <EuiFilterSelectItem
          checked={selectedLevels.includes(level) ? 'on' : undefined}
          key={level}
          onClick={() => onToggleLevel(level)}
        >
          {level}
        </EuiFilterSelectItem>
      ))}
    </EuiPopover>
  );
});
