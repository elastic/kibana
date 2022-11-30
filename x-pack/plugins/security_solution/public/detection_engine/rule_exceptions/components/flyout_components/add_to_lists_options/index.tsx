/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiRadio, EuiFlexItem, EuiFlexGroup, EuiIconTip } from '@elastic/eui';

import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import { ExceptionsAddToListsTable } from '../add_to_lists_table';

interface ExceptionsAddToListsOptionsComponentProps {
  rulesCount: number;
  selectedRadioOption: string;
  sharedLists: ListArray;
  onListsSelectionChange: (listsSelectedToAdd: ExceptionListSchema[]) => void;
  onRadioChange: (option: string) => void;
}

const ExceptionsAddToListsOptionsComponent: React.FC<ExceptionsAddToListsOptionsComponentProps> = ({
  rulesCount,
  selectedRadioOption,
  sharedLists,
  onListsSelectionChange,
  onRadioChange,
}): JSX.Element => {
  return (
    <>
      <EuiRadio
        id="add_to_lists"
        label={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            ata-test-subj="addToListsRadioOptionLabel"
          >
            <EuiFlexItem grow={false}>
              <EuiText>{i18n.ADD_TO_LISTS_OPTION}</EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj="addToListsOption">
              <EuiIconTip
                content={
                  sharedLists.length === 0
                    ? i18n.ADD_TO_LISTS_OPTION_DISABLED_TOOLTIP(rulesCount)
                    : i18n.ADD_TO_LISTS_OPTION_TOOLTIP
                }
                title={i18n.ADD_TO_LISTS_OPTION}
                position="top"
                type="iInCircle"
                data-test-subj="addToListsOptionTooltip"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checked={selectedRadioOption === 'add_to_lists'}
        disabled={sharedLists.length === 0 && rulesCount > 0}
        onChange={() => onRadioChange('add_to_lists')}
        data-test-subj="addToListsRadioOption"
      />

      {selectedRadioOption === 'add_to_lists' && (sharedLists.length > 0 || rulesCount === 0) && (
        <ExceptionsAddToListsTable
          showAllSharedLists={rulesCount === 0}
          sharedExceptionLists={sharedLists}
          onListSelectionChange={onListsSelectionChange}
          data-test-subj="exceptionsAddToListTable"
        />
      )}
    </>
  );
};

export const ExceptionsAddToListsOptions = React.memo(ExceptionsAddToListsOptionsComponent);

ExceptionsAddToListsOptions.displayName = 'ExceptionsAddToListsOptions';
