/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import type { FunctionDefinition } from '../../../common/types';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';

interface FunctionListOption {
  label: string;
  searchableLabel: string;
}

export function FunctionListPopover({
  selectedFunctionName,
  onSelectFunction,
  disabled,
}: {
  selectedFunctionName?: string;
  onSelectFunction: (func: string) => void;
  disabled: boolean;
}) {
  const { getFunctions } = useObservabilityAIAssistantChatService();
  const functions = getFunctions();

  const filterRef = useRef<HTMLInputElement | null>(null);

  const [functionOptions, setFunctionOptions] = useState<
    Array<EuiSelectableOption<FunctionListOption>>
  >(mapFunctions({ functions, selectedFunctionName }));

  const [isFunctionListOpen, setIsFunctionListOpen] = useState(false);

  const handleClickFunctionList = () => {
    setIsFunctionListOpen(!isFunctionListOpen);
  };

  const handleSelectFunction = (func: EuiSelectableOption<FunctionListOption>) => {
    setIsFunctionListOpen(false);
    onSelectFunction(func.label);
  };

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'Digit4') {
        setIsFunctionListOpen(true);
      }
    };

    window.addEventListener('keyup', keyboardListener);

    return () => {
      window.removeEventListener('keyup', keyboardListener);
    };
  }, []);

  useEffect(() => {
    if (isFunctionListOpen && filterRef.current) {
      filterRef.current.focus();
    }
  }, [isFunctionListOpen]);

  useEffect(() => {
    const options = mapFunctions({ functions, selectedFunctionName });
    if (options.length !== functionOptions.length) {
      setFunctionOptions(options);
    }
  }, [functionOptions.length, functions, selectedFunctionName]);

  const renderFunctionOption = (
    option: EuiSelectableOption<FunctionListOption>,
    searchValue: string
  ) => {
    return (
      <>
        <EuiText size="s">
          <p>
            <strong>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>{' '}
            </strong>
          </p>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <EuiHighlight search={searchValue}>{option.searchableLabel || ''}</EuiHighlight>
          </p>
        </EuiText>
      </>
    );
  };

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={
        <EuiButtonEmpty
          iconType="arrowRight"
          iconSide="right"
          size="xs"
          onClick={handleClickFunctionList}
          disabled={disabled}
        >
          {selectedFunctionName
            ? selectedFunctionName
            : i18n.translate('xpack.observabilityAiAssistant.prompt.functionList.callFunction', {
                defaultMessage: 'Call function',
              })}
        </EuiButtonEmpty>
      }
      closePopover={handleClickFunctionList}
      css={{ maxWidth: 400 }}
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
          inputRef: (node) => (filterRef.current = node),
          placeholder: i18n.translate('xpack.observabilityAiAssistant.prompt.functionList.filter', {
            defaultMessage: 'Filter',
          }),
        }}
        singleSelection
        onChange={(options) => {
          const selectedFunction = options.filter((fn) => fn.checked !== 'off');
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
  return functions.map((func) => ({
    label: func.options.name,
    searchableLabel: func.options.descriptionForUser,
    checked:
      func.options.name === selectedFunctionName
        ? ('on' as EuiSelectableOptionCheckedType)
        : ('off' as EuiSelectableOptionCheckedType),
  }));
}
