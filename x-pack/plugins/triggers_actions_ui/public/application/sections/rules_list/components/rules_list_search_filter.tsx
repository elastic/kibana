/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFieldSearch, EuiIcon, EuiPopover, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  inputText: string;
  showRuleParamFilter: boolean;

  ruleParamText: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeRuleParams: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

type InputMode = 'name' | 'ruleParams';

export function RulesListSearchFilter({
  inputText,
  ruleParamText,
  showRuleParamFilter = false,
  onChangeRuleParams,
  onChange,
  onKeyUp,
}: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>(
    showRuleParamFilter && ruleParamText && !inputText ? 'ruleParams' : 'name'
  );

  const handleSelectInputModeClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handelInputModeSwitch = () => {
    setInputMode(inputMode === 'name' ? 'ruleParams' : 'name');
  };

  const ModeSelector = (
    <EuiPopover
      button={
        <EuiButtonEmpty
          aria-label="Calendar dropdown"
          iconType="arrowDown"
          iconSide="right"
          role="button"
          size="xs"
          onClick={handleSelectInputModeClick}
        >
          <EuiIcon type="kqlSelector" />
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
    >
      <EuiSwitch
        label={
          <>
            {i18n.translate('xpack.triggersActionsUI.sections.rulesList.inputModeSwitch', {
              defaultMessage: 'Search in',
            })}
            <strong>
              {' '}
              {i18n.translate('xpack.triggersActionsUI.sections.rulesList.inputMode', {
                defaultMessage: '{mode}',
                values: {
                  mode: inputMode === 'ruleParams' ? 'Rule parameters' : 'Rule name',
                },
              })}
            </strong>
          </>
        }
        checked={inputMode === 'ruleParams'}
        onChange={handelInputModeSwitch}
      />
    </EuiPopover>
  );

  return inputMode === 'name' ? (
    <EuiFieldSearch
      data-test-subj="ruleSearchField"
      fullWidth
      isClearable
      placeholder={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.searchPlaceholderTitle',
        { defaultMessage: 'Search' }
      )}
      prepend={showRuleParamFilter ? ModeSelector : undefined}
      value={inputText}
      onChange={onChange}
      onKeyUp={onKeyUp}
    />
  ) : (
    <EuiFieldSearch
      data-test-subj="ruleParamsField"
      fullWidth
      isClearable
      placeholder={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.filterPlaceholderTitle',
        { defaultMessage: 'Search' }
      )}
      prepend={showRuleParamFilter ? ModeSelector : undefined}
      value={ruleParamText}
      onChange={onChangeRuleParams}
      onKeyUp={onKeyUp}
    />
  );
}
