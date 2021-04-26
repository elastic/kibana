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
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { FieldValueSelectionProps } from './types';

const formatOptions = (values?: string[], value?: string): EuiSelectableOption[] => {
  return (values ?? []).map((val) => ({
    label: val,
    ...(value === val ? { checked: 'on' } : {}),
  }));
};

export function FieldValueSelection({
  fullWidth,
  label,
  value,
  loading,
  values,
  setQuery,
  button,
  width,
  forceOpen,
  anchorPosition,
  singleSelection,
  onChange: onSelectionChange,
}: FieldValueSelectionProps) {
  const [options, setOptions] = useState<EuiSelectableOption[]>(formatOptions(values, value));
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setOptions(formatOptions(values, value));
  }, [values, value]);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const onChange = (optionsN: EuiSelectableOption[]) => {
    setOptions(optionsN);
  };

  const onValueChange = (evt: FormEvent<HTMLInputElement>) => {
    setQuery((evt.target as HTMLInputElement).value);
  };

  const anchorButton = (
    <EuiButton
      style={width ? { width } : {}}
      size="s"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      data-test-subj={'fieldValueSelectionBtn'}
      fullWidth={fullWidth}
    >
      {label}
    </EuiButton>
  );

  return (
    <Wrapper>
      <EuiPopover
        id="popover"
        panelPaddingSize="none"
        button={button || anchorButton}
        isOpen={isPopoverOpen || forceOpen}
        closePopover={closePopover}
        anchorPosition={anchorPosition}
        style={{ width: '100%' }}
      >
        <EuiSelectable
          searchable
          singleSelection={singleSelection}
          searchProps={{
            placeholder: i18n.translate('xpack.observability.fieldValueSelection.placeholder', {
              defaultMessage: 'Filter {label}',
              values: { label },
            }),
            compressed: true,
            onInput: onValueChange,
          }}
          options={options}
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
                  disabled={
                    !value &&
                    (options.length === 0 || !options.find((opt) => opt?.checked === 'on'))
                  }
                  onClick={() => {
                    const selected = options.find((opt) => opt?.checked === 'on');
                    onSelectionChange(selected?.label);
                    setIsPopoverOpen(false);
                  }}
                >
                  {i18n.translate('xpack.observability.fieldValueSelection.apply', {
                    defaultMessage: 'Apply',
                  })}
                </EuiButton>
              </EuiPopoverFooter>
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  &&& {
    div.euiPopover__anchor {
      width: 100%;
      max-width: 250px;
      .euiButton {
        width: 100%;
      }
    }
  }
`;
