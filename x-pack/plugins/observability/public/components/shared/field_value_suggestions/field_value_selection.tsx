/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent, Fragment, useEffect, useState, Dispatch, SetStateAction } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PopoverAnchorPosition } from '@elastic/eui/src/components/popover/popover';

export interface FieldValueSelectionProps {
  value?: string;
  label: string;
  loading?: boolean;
  onChange: (val?: string) => void;
  values?: string[];
  setQuery: Dispatch<SetStateAction<string>>;
  anchorPosition?: PopoverAnchorPosition;
  forceOpen?: boolean;
  button?: JSX.Element;
  width?: number;
}

const formatOptions = (values?: string[], value?: string): EuiSelectableOption[] => {
  return (values ?? []).map((val) => ({
    label: val,
    ...(value === val ? { checked: 'on' } : {}),
  }));
};

export function FieldValueSelection({
  label,
  value,
  loading,
  values,
  setQuery,
  button,
  width,
  forceOpen,
  anchorPosition,
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
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      data-test-subj={'fieldValueSelectionBtn'}
    >
      {label}
    </EuiButton>
  );

  return (
    <Fragment>
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
    </Fragment>
  );
}
