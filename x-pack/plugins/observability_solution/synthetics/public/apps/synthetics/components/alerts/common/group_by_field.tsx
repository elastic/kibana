/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';

interface Option {
  label: string;
  key: 'groupByLocation' | 'ungrouped';
}

const OPTIONS: Option[] = [
  {
    label: i18n.translate('xpack.synthetics.forTheLastExpression.groupByLocation', {
      defaultMessage: 'Location',
    }),
    key: 'groupByLocation',
  },
  {
    label: i18n.translate('xpack.synthetics.forTheLastExpression.ungrouped', {
      defaultMessage: 'Ungrouped',
    }),
    key: 'ungrouped',
  },
];

export const GroupByExpression = ({
  groupByLocation,
  onChange,
}: {
  groupByLocation: boolean;
  onChange: (val: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>(OPTIONS);

  useEffect(() => {
    setOptions(
      OPTIONS.map((option) => ({
        key: option.key as 'groupByLocation' | 'ungrouped',
        label: option.label,
        checked:
          groupByLocation && option.key === 'groupByLocation'
            ? 'on'
            : option.key === 'ungrouped' && !groupByLocation
            ? 'on'
            : undefined,
      }))
    );
  }, [groupByLocation]);

  return (
    <EuiPopover
      id="groupByPopover"
      panelPaddingSize="s"
      button={
        <EuiExpression
          description={'Group by'}
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          value={groupByLocation ? 'Location' : 'Ungrouped'}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiSelectable<Option>
        singleSelection="always"
        options={options}
        onChange={(selectedValues) => {
          const selectedValue = selectedValues.filter((v) => v.checked === 'on')?.[0];
          switch (selectedValue?.key) {
            case 'groupByLocation':
              onChange(true);
              break;
            case 'ungrouped':
              onChange(false);
              break;
            default:
              break;
          }
        }}
      >
        {(list) => (
          <div style={{ width: 240 }}>
            <EuiPopoverTitle>
              {i18n.translate('xpack.synthetics.forTheLastExpression.groupBy', {
                defaultMessage: 'When',
              })}
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
