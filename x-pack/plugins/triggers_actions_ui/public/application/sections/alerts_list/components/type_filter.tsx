/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFilterGroup, EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';

interface TypeFilterProps {
  options: Array<{
    value: string;
    name: string;
  }>;
  onChange?: (selectedTags: string[]) => void;
}

export const TypeFilter: React.FunctionComponent<TypeFilterProps> = ({
  options,
  onChange,
}: TypeFilterProps) => {
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
              id="xpack.triggersActionsUI.sections.alertsList.typeFilterLabel"
              defaultMessage="Type"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {options.map((item, index) => (
            <EuiFilterSelectItem
              key={index}
              onClick={() => {
                const isPreviouslyChecked = selectedValues.includes(item.value);
                if (isPreviouslyChecked) {
                  setSelectedValues(selectedValues.filter((val) => val !== item.value));
                } else {
                  setSelectedValues(selectedValues.concat(item.value));
                }
              }}
              checked={selectedValues.includes(item.value) ? 'on' : undefined}
            >
              {item.name}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
