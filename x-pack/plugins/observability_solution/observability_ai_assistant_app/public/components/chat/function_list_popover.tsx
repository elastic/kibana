/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/public';
import type { FunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';

interface FunctionListOption {
  label: string;
  searchableLabel: string;
}

export function FunctionListPopover({
  mode,
  selectedFunctionName,
  onSelectFunction,
  disabled,
}: {
  mode: 'prompt' | 'function';
  selectedFunctionName?: string;
  onSelectFunction: (func: string | undefined) => void;
  disabled: boolean;
}) {
  const { getFunctions } = useObservabilityAIAssistantChatService();
  const functions = getFunctions();

  const [functionOptions, setFunctionOptions] = useState<
    Array<EuiSelectableOption<FunctionListOption>>
  >(mapFunctions({ functions, selectedFunctionName }));

  const [isFunctionListOpen, setIsFunctionListOpen] = useState(false);

  const handleClickFunctionList = () => {
    if (selectedFunctionName) {
      onSelectFunction(undefined);
      setIsFunctionListOpen(false);
      return;
    }

    setIsFunctionListOpen(!isFunctionListOpen);
  };

  const handleSelectFunction = (func: EuiSelectableOption<FunctionListOption>) => {
    setIsFunctionListOpen(false);
    onSelectFunction(func.label);
  };

  useEffect(() => {
    const options = mapFunctions({ functions, selectedFunctionName });
    if (options.length !== functionOptions.length) {
      setFunctionOptions(options);
    }
  }, [functionOptions.length, functions, selectedFunctionName]);

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={
        <EuiToolTip
          key={mode} // this is added to prevent the tooltip from flickering when the mode stays the same
          content={
            mode === 'prompt'
              ? i18n.translate(
                  'xpack.observabilityAiAssistant.functionListPopover.euiToolTip.selectAFunctionLabel',
                  { defaultMessage: 'Select a function' }
                )
              : i18n.translate(
                  'xpack.observabilityAiAssistant.functionListPopover.euiToolTip.clearFunction',
                  {
                    defaultMessage: 'Clear function',
                  }
                )
          }
          display="block"
        >
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.functionListPopover.euiButtonIcon.selectAFunctionLabel',
              { defaultMessage: 'Select function' }
            )}
            data-test-subj="observabilityAiAssistantFunctionListPopoverButton"
            disabled={disabled}
            iconType={selectedFunctionName ? 'cross' : 'plusInCircle'}
            size="xs"
            onClick={handleClickFunctionList}
          />
        </EuiToolTip>
      }
      closePopover={handleClickFunctionList}
      css={{ maxWidth: 400 }}
      initialFocus="#searchFilterList"
      panelPaddingSize="none"
      isOpen={isFunctionListOpen}
    >
      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.observabilityAiAssistant.prompt.functionList.functionList',
          {
            defaultMessage: 'Function list',
          }
        )}
        listProps={{
          isVirtualized: false,
          showIcons: false,
        }}
        options={functionOptions}
        renderOption={renderFunctionOption}
        searchable
        searchProps={{
          'data-test-subj': 'searchFiltersList',
          id: 'searchFilterList',
          placeholder: i18n.translate('xpack.observabilityAiAssistant.prompt.functionList.filter', {
            defaultMessage: 'Filter',
          }),
        }}
        singleSelection
        onChange={(options) => {
          const selectedFunction = options.filter((fn) => !('checked' in fn));
          if (selectedFunction && selectedFunction.length === 1) {
            handleSelectFunction({ ...selectedFunction[0], checked: 'on' });
          }
        }}
      >
        {(list, search) => (
          <div style={{ overflow: 'hidden' }}>
            {search}
            <div style={{ width: 500, height: 350, overflowY: 'scroll' }}>{list}</div>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}

function mapFunctions({
  functions,
  selectedFunctionName,
}: {
  functions: FunctionDefinition[];
  selectedFunctionName: string | undefined;
}) {
  return functions
    .filter(
      (func) =>
        func.visibility !== FunctionVisibility.AssistantOnly &&
        func.visibility !== FunctionVisibility.Internal
    )
    .map((func) => ({
      label: func.name,
      searchableLabel: func.descriptionForUser || func.description,
      checked:
        func.name === selectedFunctionName
          ? ('on' as EuiSelectableOptionCheckedType)
          : ('off' as EuiSelectableOptionCheckedType),
    }));
}

function renderFunctionOption(
  option: EuiSelectableOption<FunctionListOption>,
  searchValue: string
) {
  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>{' '}
                <EuiBetaBadge label="beta" size="s" style={{ verticalAlign: 'middle' }} />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          style={{ textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: 4 }}
        >
          <EuiHighlight search={searchValue}>{option.searchableLabel || ''}</EuiHighlight>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
