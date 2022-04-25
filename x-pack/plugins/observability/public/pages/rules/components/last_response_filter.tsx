/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/function-component-definition */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiHealth,
} from '@elastic/eui';
import { RuleExecutionStatuses, RuleExecutionStatusValues } from '@kbn/alerting-plugin/common';
import { getHealthColor, rulesStatusesTranslationsMapping } from '../config';
import { StatusFilterProps } from '../types';

export const LastResponseFilter: React.FunctionComponent<StatusFilterProps> = ({
  selectedStatuses,
  onChange,
}: StatusFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedStatuses);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
  }, [selectedValues, onChange]);

  useEffect(() => {
    setSelectedValues(selectedStatuses);
  }, [selectedStatuses]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={selectedValues.length > 0}
            numActiveFilters={selectedValues.length}
            numFilters={selectedValues.length}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="ruleStatusFilterButton"
          >
            <FormattedMessage
              id="xpack.observability.rules.ruleLastResponseFilterLabel"
              defaultMessage="Last response"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {[...RuleExecutionStatusValues].sort().map((item: RuleExecutionStatuses) => {
            const healthColor = getHealthColor(item);
            return (
              <EuiFilterSelectItem
                key={item}
                style={{ textTransform: 'capitalize' }}
                onClick={() => {
                  const isPreviouslyChecked = selectedValues.includes(item);
                  if (isPreviouslyChecked) {
                    setSelectedValues(selectedValues.filter((val) => val !== item));
                  } else {
                    setSelectedValues(selectedValues.concat(item));
                  }
                }}
                checked={selectedValues.includes(item) ? 'on' : undefined}
                data-test-subj={`ruleStatus${item}FilerOption`}
              >
                <EuiHealth color={healthColor}>{rulesStatusesTranslationsMapping[item]}</EuiHealth>
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
