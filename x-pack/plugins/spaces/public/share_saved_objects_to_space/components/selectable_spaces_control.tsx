/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './selectable_spaces_control.scss';
import React, { Fragment } from 'react';
import { EuiBadge, EuiSelectable, EuiSelectableOption, EuiLoadingSpinner } from '@elastic/eui';
import { SpaceAvatar } from '../../space_avatar';
import { SpaceTarget } from '../types';

interface Props {
  spaces: SpaceTarget[];
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
  disabled?: boolean;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

const activeSpaceProps = {
  append: <EuiBadge color="hollow">Current</EuiBadge>,
  disabled: true,
  checked: 'on' as 'on',
};

export const SelectableSpacesControl = (props: Props) => {
  if (props.spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const options = props.spaces
    .sort((a, b) => (a.isActiveSpace ? -1 : b.isActiveSpace ? 1 : 0))
    .map<SpaceOption>((space) => ({
      label: space.name,
      prepend: <SpaceAvatar space={space} size={'s'} />,
      checked: props.selectedSpaceIds.includes(space.id) ? 'on' : undefined,
      ['data-space-id']: space.id,
      ['data-test-subj']: `sts-space-selector-row-${space.id}`,
      ...(space.isActiveSpace ? activeSpaceProps : {}),
    }));

  function updateSelectedSpaces(selectedOptions: SpaceOption[]) {
    if (props.disabled) return;

    const selectedSpaceIds = selectedOptions
      .filter((opt) => opt.checked && !opt.disabled)
      .map((opt) => opt['data-space-id']);

    props.onChange(selectedSpaceIds);
  }

  return (
    <EuiSelectable
      options={options}
      onChange={(newOptions) => updateSelectedSpaces(newOptions as SpaceOption[])}
      listProps={{
        bordered: true,
        rowHeight: 40,
        className: 'spcShareToSpace__spacesList',
        'data-test-subj': 'sts-form-space-selector',
      }}
      searchable
    >
      {(list, search) => {
        return (
          <Fragment>
            {search}
            {list}
          </Fragment>
        );
      }}
    </EuiSelectable>
  );
};
