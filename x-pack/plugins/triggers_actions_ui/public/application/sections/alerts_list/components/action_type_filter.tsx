/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFilterGroup, EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { ActionType } from '../../../../types';

interface ActionTypeFilterProps {
  actionTypes: ActionType[];
  onChange?: (selectedActionTypeIds: string[]) => void;
}

export const ActionTypeFilter: React.FunctionComponent<ActionTypeFilterProps> = ({
  actionTypes,
  onChange,
}: ActionTypeFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues]);

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
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.actionTypeFilterLabel"
              defaultMessage="Action type"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {actionTypes.map((item) => (
            <EuiFilterSelectItem
              key={item.id}
              onClick={() => {
                const isPreviouslyChecked = selectedValues.includes(item.id);
                if (isPreviouslyChecked) {
                  setSelectedValues(selectedValues.filter((val) => val !== item.id));
                } else {
                  setSelectedValues(selectedValues.concat(item.id));
                }
              }}
              checked={selectedValues.includes(item.id) ? 'on' : undefined}
            >
              {item.name}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
