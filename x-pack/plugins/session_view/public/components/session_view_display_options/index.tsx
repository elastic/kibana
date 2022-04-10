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
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { DisplayOptionsState } from '../../../common/types/session_view';
import { useStyles } from './styles';

const TIMESTAMP_OPTION_KEY = 'Timestamp';
const VERBOSE_MODE_OPTION_KEY = 'Verbose mode';

export const SessionViewDisplayOptions = ({
  onChange,
  displayOptions,
}: {
  onChange: (vars: DisplayOptionsState) => void;
  displayOptions: DisplayOptionsState;
}) => {
  const [isOptionDropdownOpen, setOptionDropdownOpen] = useState(false);

  const styles = useStyles();

  const optionsList: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate(
          'xpack.sessionView.sessionViewToggle.sessionViewToggleOptionsTimestamp',
          {
            defaultMessage: 'Timestamp',
          }
        ),
        key: TIMESTAMP_OPTION_KEY,
        checked: displayOptions?.timestamp ? 'on' : undefined,
      },
      {
        label: i18n.translate(
          'xpack.sessionView.sessionViewToggle.sessionViewToggleOptionsVerbosemode',
          {
            defaultMessage: 'Verbose mode',
          }
        ),
        key: VERBOSE_MODE_OPTION_KEY,
        checked: displayOptions?.verboseMode ? 'on' : undefined,
        append: (
          <EuiIconTip
            content={
              <FormattedMessage
                id="xpack.sessionView.sessionViewToggle.sessionViewToggleOptionsVerboseModeTooltips"
                defaultMessage="Verbose mode displays all processes created in a session, including shell startup, shell completion, and forks caused by built-in commands"
              />
            }
          />
        ),
      },
    ],
    [displayOptions]
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
        display={displayOptions.verboseMode || displayOptions.timestamp ? 'fill' : 'empty'}
        onClick={toggleOptionButton}
        size="m"
        aria-label="Session view display option"
        data-test-subj="sessionView:sessionViewOptionButton"
      />
    </EuiFlexItem>
  );

  const handleSelect = (options: EuiSelectableOption[]) => {
    const updateOptionState = options.reduce(
      (chosenOptionStates: DisplayOptionsState, listedOptionStates: EuiSelectableOption) => {
        if (listedOptionStates.key === TIMESTAMP_OPTION_KEY) {
          chosenOptionStates.timestamp = listedOptionStates.checked === 'on';
        } else if (listedOptionStates.key === VERBOSE_MODE_OPTION_KEY) {
          chosenOptionStates.verboseMode = listedOptionStates.checked === 'on';
        }
        return chosenOptionStates;
      },
      { ...displayOptions }
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
