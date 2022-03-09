/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiSelectable,
  EuiPopoverTitle,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';

interface OptionsField {
  label: string;
  value: string;
  checked: 'on' | 'off' | undefined;
}
interface StateField {
  timeStamp: boolean;
  verboseMode: boolean;
}

export const SessionViewDisplayOptions = ({
  onChange,
  optionsStates,
}: {
  onChange: (vars) => void;
  // optionsStates: {timeStamp: boolean; verboseMode: boolean};
  optionsStates: StateField;
}) => {
  const [isOptionDropdownOpen, setOptionDropdownOpen] = useState(false);

  const optionsList: OptionsField[] = useMemo(
    () => [
      {
        label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptions', {
          defaultMessage: 'Timestamp',
        }),
        value: 'Timestamp',
        checked: optionsStates?.timeStamp ? 'on' : undefined,
      },
      {
        label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptions', {
          defaultMessage: 'Verbose mode',
        }),
        value: 'Verbose mode',
        checked: optionsStates?.verboseMode ? 'on' : undefined,
      },
    ],
    [optionsStates, optionsStates.timeStamp, optionsStates.verboseMode]
  );

  const toggleOptionButton = () => {
    setOptionDropdownOpen(!isOptionDropdownOpen);
  };

  const closeOptionButton = () => {
    setOptionDropdownOpen(false);
  };

  const OptionButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="eye"
        display={isOptionDropdownOpen ? 'base' : 'empty'}
        onClick={toggleOptionButton}
        size="m"
        aria-label="Option"
        data-test-subj="sessionViewOptionButton"
      />
    </EuiFlexItem>
  );

  const handleSelect = (vars: [OptionsField]) => {
    const initialState = { ...optionsStates };
    const endingState = vars.reduce((prev: StateField, curr: OptionsField) => {
      if (curr.value === 'Timestamp') {
        prev.timeStamp = curr.checked === 'on';
      } else if (curr.value === 'Verbose mode') {
        prev.verboseMode = curr.checked === 'on';
      }
      return prev;
    }, initialState);
    onChange(endingState);
  };

  return (
    <>
      <EuiPopover
        button={OptionButton}
        isOpen={isOptionDropdownOpen}
        closePopover={closeOptionButton}
      >
        <EuiSelectable options={optionsList} onChange={handleSelect}>
          {(list) => (
            <div style={{ width: 240 }}>
              <EuiPopoverTitle>Display options</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </>
  );
};
