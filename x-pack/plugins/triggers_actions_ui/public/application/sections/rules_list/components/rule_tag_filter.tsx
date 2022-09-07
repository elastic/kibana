/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSelectable,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectableProps,
  EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';

export interface RuleTagFilterProps {
  tags: string[];
  selectedTags: string[];
  isGrouped?: boolean; // Whether or not this should appear as the child of a EuiFilterGroup
  isLoading?: boolean;
  loadingMessage?: EuiSelectableProps['loadingMessage'];
  noMatchesMessage?: EuiSelectableProps['noMatchesMessage'];
  emptyMessage?: EuiSelectableProps['emptyMessage'];
  errorMessage?: EuiSelectableProps['errorMessage'];
  dataTestSubj?: string;
  selectableDataTestSubj?: string;
  optionDataTestSubj?: (tag: string) => string;
  buttonDataTestSubj?: string;
  onChange: (tags: string[]) => void;
}

const getOptionDataTestSubj = (tag: string) => `ruleTagFilterOption-${tag}`;

export const RuleTagFilter = (props: RuleTagFilterProps) => {
  const {
    tags = [],
    selectedTags = [],
    isGrouped = false,
    isLoading = false,
    loadingMessage,
    noMatchesMessage,
    emptyMessage,
    errorMessage,
    dataTestSubj = 'ruleTagFilter',
    selectableDataTestSubj = 'ruleTagFilterSelectable',
    optionDataTestSubj = getOptionDataTestSubj,
    buttonDataTestSubj = 'ruleTagFilterButton',
    onChange = () => {},
  } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const allTags = useMemo(() => {
    return [...new Set([...tags, ...selectedTags])].sort();
  }, [tags, selectedTags]);

  const options = useMemo(
    () =>
      allTags.map((tag) => ({
        label: tag,
        checked: selectedTags.includes(tag) ? ('on' as const) : undefined,
        'data-test-subj': optionDataTestSubj(tag),
      })),
    [allTags, selectedTags, optionDataTestSubj]
  );

  const onChangeInternal = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedTags = newOptions.reduce<string[]>((result, option) => {
        if (option.checked === 'on') {
          result = [...result, option.label];
        }
        return result;
      }, []);

      onChange(newSelectedTags);
    },
    [onChange]
  );

  const onClosePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const renderButton = () => {
    return (
      <EuiFilterButton
        data-test-subj={buttonDataTestSubj}
        iconType="arrowDown"
        hasActiveFilters={selectedTags.length > 0}
        numActiveFilters={selectedTags.length}
        numFilters={selectedTags.length}
        onClick={onClosePopover}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.ruleTagFilterButton"
          defaultMessage="Tags"
        />
      </EuiFilterButton>
    );
  };

  const Container = useMemo(() => {
    if (isGrouped) {
      return React.Fragment;
    }
    return EuiFilterGroup;
  }, [isGrouped]);

  return (
    <Container>
      <EuiPopover
        data-test-subj={dataTestSubj}
        isOpen={isPopoverOpen}
        closePopover={onClosePopover}
        button={renderButton()}
      >
        <EuiSelectable
          searchable
          data-test-subj={selectableDataTestSubj}
          isLoading={isLoading}
          options={options}
          loadingMessage={loadingMessage}
          noMatchesMessage={noMatchesMessage}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage}
          onChange={onChangeInternal}
        >
          {(list, search) => (
            <>
              {search}
              <EuiSpacer size="xs" />
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiPopover>
    </Container>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleTagFilter as default };
