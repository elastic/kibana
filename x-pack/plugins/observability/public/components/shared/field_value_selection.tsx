/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { PopoverAnchorPosition } from '@elastic/eui/src/components/popover/popover';
import { useValuesList } from '../../hooks/use_values_list';
import { IIndexPattern } from '../../../../../../src/plugins/data/common';
import { ESFilter } from '../../../../../../typings/elasticsearch';

interface Option {
  id: string;
  label: string;
  checked?: 'on';
}

interface Props {
  value?: string;
  label: string;
  indexPattern: IIndexPattern;
  sourceField: string;
  onChange: (val?: string) => void;
  filters: ESFilter[];
  anchorPosition?: PopoverAnchorPosition;
  time?: { from: string; to: string };
  forceOpen?: boolean;
  button?: JSX.Element;
}

export function FieldValueSelection({
  sourceField,
  indexPattern,
  value,
  label,
  filters,
  button,
  time,
  forceOpen,
  anchorPosition,
  onChange: onSelectionChange,
}: Props) {
  const [query, setQuery] = useState('');
  const { values, loading } = useValuesList({ indexPattern, query, sourceField, filters, time });

  const [options, setOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setOptions(
      (values ?? []).map((val) => ({ id: val, label: val, ...(value ? { checked: 'on' } : {}) }))
    );
  }, [values]);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const onChange = (options: Option[]) => {
    setOptions(options);
  };

  const onValueChange = (evt: FormEvent<HTMLInputElement>) => {
    setQuery((evt.target as HTMLInputElement).value);
  };

  const anchorButton = (
    <EuiButton
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      color="text"
      style={{ width: 200 }}
    >
      {label}
    </EuiButton>
  );

  return (
    <EuiPopover
      id="popover"
      panelPaddingSize="none"
      button={button || anchorButton}
      isOpen={isPopoverOpen || forceOpen}
      closePopover={closePopover}
      anchorPosition={anchorPosition}
    >
      <EuiSelectable
        searchable
        singleSelection
        searchProps={{
          placeholder: `Filter ${label ?? 'list'}`,
          compressed: true,
          onInput: onValueChange,
        }}
        options={options as any}
        onChange={onChange}
        isLoading={loading}
      >
        {(list, search) => (
          <div style={{ width: 240 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButton
                size="s"
                fullWidth
                disabled={options.length === 0 || !options.find((opt) => opt?.checked === 'on')}
                onClick={() => {
                  const selected = options.find((opt) => opt?.checked === 'on');
                  onSelectionChange(selected?.label);
                  setIsPopoverOpen(false);
                }}
              >
                Apply
              </EuiButton>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
