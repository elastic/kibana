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
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { StateField } from '../../../common/types/session_view';
import { useStyles } from './styles';

export const SessionViewDisplayOptions = ({
  onChange,
  optionsStates,
}: {
  onChange: (vars: StateField) => void;
  optionsStates: StateField;
}) => {
  const [isOptionDropdownOpen, setOptionDropdownOpen] = useState(false);

  const styles = useStyles();

  const timestampString = 'Timestamp';
  const verboseModeString = 'Verbose mode';

  const optionsList: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptionsTimestamp', {
          defaultMessage: 'Timestamp',
        }),
        key: timestampString,
        checked: optionsStates?.timestamp ? 'on' : undefined,
      },
      {
        label: i18n.translate('xpack.sessionView.sessionViewToggle.sessionViewToggleOptionsVerbosemode', {
          defaultMessage: 'Verbose mode',
        }),
        key: verboseModeString,
        checked: optionsStates?.verboseMode ? 'on' : undefined,
      },
    ],
    [optionsStates]
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
        display={optionsStates.verboseMode ? 'fill' : 'empty'}
        onClick={toggleOptionButton}
        size="m"
        aria-label="Option"
        data-test-subj="sessionView:sessionViewOptionButton"
      />
    </EuiFlexItem>
  );

  const handleSelect = (options: EuiSelectableOption[]) => {
    const updateOptionState = options.reduce(
      (chosenOptionStates: StateField, listedOptionStates: EuiSelectableOption) => {
        if (listedOptionStates.key === timestampString) {
          chosenOptionStates.timestamp = listedOptionStates.checked === 'on';
        } else if (listedOptionStates.key === verboseModeString) {
          chosenOptionStates.verboseMode = listedOptionStates.checked === 'on';
        }
        return chosenOptionStates;
      },
      { ...optionsStates }
    );
    onChange(updateOptionState);
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
            <div css={styles.selectable}>
              <EuiPopoverTitle>
                <FormattedMessage
                  defaultMessage="Display options"
                  id="xpack.sessionView.sessionViewToggle.sessionViewToggleTitle"
                />
              </EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </>
  );
};
