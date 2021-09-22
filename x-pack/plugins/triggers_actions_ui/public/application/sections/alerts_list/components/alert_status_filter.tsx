/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiHealth,
} from '@elastic/eui';
import {
  AlertExecutionStatuses,
  AlertExecutionStatusValues,
} from '../../../../../../alerting/common';
import { alertsStatusesTranslationsMapping } from '../translations';

interface AlertStatusFilterProps {
  selectedStatuses: string[];
  onChange?: (selectedAlertStatusesIds: string[]) => void;
}

export const AlertStatusFilter: React.FunctionComponent<AlertStatusFilterProps> = ({
  selectedStatuses,
  onChange,
}: AlertStatusFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedStatuses);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues]);

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
            data-test-subj="alertStatusFilterButton"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.alertStatusFilterLabel"
              defaultMessage="Status"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {[...AlertExecutionStatusValues].sort().map((item: AlertExecutionStatuses) => {
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
                data-test-subj={`alertStatus${item}FilerOption`}
              >
                <EuiHealth color={healthColor}>{alertsStatusesTranslationsMapping[item]}</EuiHealth>
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export function getHealthColor(status: AlertExecutionStatuses) {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'danger';
    case 'ok':
      return 'subdued';
    case 'pending':
      return 'accent';
    default:
      return 'warning';
  }
}
