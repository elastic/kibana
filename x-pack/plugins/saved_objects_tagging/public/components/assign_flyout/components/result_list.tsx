/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiIcon, EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import { AssignableObject } from '../../../../common/types';
import { AssignmentOverrideMap, AssignmentStatusMap } from '../types';
import { getKey, getOverriddenStatus } from '../utils';

export interface AssignFlyoutResultListProps {
  isLoading: boolean;
  results: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
  onChange: (newOverrides: AssignmentOverrideMap) => void;
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

    return {
      label: result.title,
      key,
      checked: checkedStatus,
      previousState: checkedStatus,
      showIcons: false,
      prepend: (
        <>
          <EuiIcon className="tagAssignFlyout__selectionIcon" type={statusIcon} />
          <EuiIcon type={result.icon ?? 'empty'} title={result.type} />
        </>
      ),
    } as EuiSelectableOption<{ previousState: 'on' | undefined }>;
  });

  return (
    <EuiSelectable<{ previousState: 'on' | undefined }>
      height="full"
      options={options}
      allowExclusions={false}
      isLoading={isLoading}
      onChange={(newOptions) => {
        const newOverrides = newOptions.reduce<AssignmentOverrideMap>((memo, option) => {
          if (option.checked === option.previousState) {
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
