/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSelectable, EuiSelectableOption, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssignableObject } from '../../../../common/assignments';
import { AssignmentAction, AssignmentOverrideMap, AssignmentStatusMap } from '../types';
import { getKey, getOverriddenStatus, getAssignmentAction } from '../utils';

export interface AssignFlyoutResultListProps {
  isLoading: boolean;
  results: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
  onChange: (newOverrides: AssignmentOverrideMap) => void;
}

interface ResultInternals {
  previously: 'on' | undefined;
}

export const AssignFlyoutResultList: FC<AssignFlyoutResultListProps> = ({
  results,
  isLoading,
  initialStatus,
  overrides,
  onChange,
}) => {
  const options = results.map((result) => {
    const key = getKey(result);
    const overriddenStatus = getOverriddenStatus(initialStatus[key], overrides[key]);
    const checkedStatus = overriddenStatus === 'full' ? 'on' : undefined;
    const statusIcon =
      overriddenStatus === 'full' ? 'check' : overriddenStatus === 'none' ? 'empty' : 'partial';
    const assignmentAction = getAssignmentAction(initialStatus[key], overrides[key]);

    return {
      label: result.title,
      key,
      'data-test-subj': `assign-result-${result.type}-${result.id}`,
      checked: checkedStatus,
      previously: checkedStatus,
      showIcons: false,
      prepend: (
        <>
          <EuiIcon
            className={`tagAssignFlyout__selectionIcon status-${overriddenStatus}`}
            type={statusIcon}
            data-test-subj="assign-result-status"
          />
          <EuiIcon type={result.icon ?? 'empty'} title={result.type} />
        </>
      ),
      append: <ResultActionLabel action={assignmentAction} />,
    } as EuiSelectableOption<ResultInternals>;
  });

  return (
    <EuiSelectable<ResultInternals>
      height="full"
      data-test-subj="assignFlyoutResultList"
      options={options}
      allowExclusions={false}
      isLoading={isLoading}
      onChange={(newOptions) => {
        const newOverrides = newOptions.reduce<AssignmentOverrideMap>((memo, option) => {
          if (option.checked === option.previously) {
            return memo;
          }
          return {
            ...memo,
            [option.key!]: option.checked === 'on' ? 'selected' : 'deselected',
          };
        }, {});

        onChange(newOverrides);
      }}
    >
      {(list) => list}
    </EuiSelectable>
  );
};

const ResultActionLabel: FC<{ action: AssignmentAction }> = ({ action }) => {
  if (action === 'unchanged') {
    return null;
  }
  return (
    <EuiText size="xs" color="subdued" style={{ display: 'inline-block' }}>
      {action === 'added' ? (
        <FormattedMessage
          id="xpack.savedObjectsTagging.assignFlyout.resultList.addedLabel"
          defaultMessage="Added"
        />
      ) : (
        <FormattedMessage
          id="xpack.savedObjectsTagging.assignFlyout.resultList.removedLabel"
          defaultMessage="Removed"
        />
      )}
    </EuiText>
  );
};
