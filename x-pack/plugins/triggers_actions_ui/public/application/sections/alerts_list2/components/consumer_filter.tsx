/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterGroup, EuiPopover, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { Consumer } from '../types';

interface ConsumerFilterProps {
  consumers: Consumer[];
  onChange?: (selectedConsumers: Consumer[]) => void;
}

export const ConsumerFilter: React.FunctionComponent<ConsumerFilterProps> = ({
  consumers,
  onChange,
}: ConsumerFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<Consumer[]>([]);
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
            data-test-subj="consumerTypeFilterButton"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.consumerTypeFilterLabel"
              defaultMessage="Consumer"
            />
          </EuiFilterButton>
        }
      >
        <div className="euiFilterSelect__items">
          {consumers.map((consumer) => (
            <EuiFilterSelectItem
              key={consumer.id}
              onClick={() => {
                const isPreviouslyChecked = selectedValues.includes(consumer);
                if (isPreviouslyChecked) {
                  setSelectedValues(selectedValues.filter((val) => val !== consumer));
                } else {
                  setSelectedValues(selectedValues.concat(consumer));
                }
              }}
              checked={selectedValues.includes(consumer) ? 'on' : undefined}
              data-test-subj={`consumerType${consumer}FilterOption`}
            >
              {consumer.name}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
