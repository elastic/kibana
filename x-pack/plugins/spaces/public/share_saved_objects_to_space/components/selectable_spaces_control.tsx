/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiSelectable, EuiSelectableOption, EuiLoadingSpinner } from '@elastic/eui';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../../../common/model/space';

interface Props {
  spaces: Space[];
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
  disabled?: boolean;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

export const SelectableSpacesControl = (props: Props) => {
  if (props.spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const options = props.spaces.map<SpaceOption>(space => ({
    label: space.name,
    prepend: <SpaceAvatar space={space} size={'s'} />,
    checked: props.selectedSpaceIds.includes(space.id) ? 'on' : undefined,
    ['data-space-id']: space.id,
    ['data-test-subj']: `cts-space-selector-row-${space.id}`,
  }));

  function updateSelectedSpaces(selectedOptions: SpaceOption[]) {
    if (props.disabled) return;

    const selectedSpaceIds = selectedOptions
      .filter(opt => opt.checked)
      .map(opt => opt['data-space-id']);

    props.onChange(selectedSpaceIds);
  }

  return (
    <EuiSelectable
      options={options}
      onChange={newOptions => updateSelectedSpaces(newOptions as SpaceOption[])}
      listProps={{
        bordered: true,
        rowHeight: 40,
        className: 'spcShareToSpace__spacesList',
        'data-test-subj': 'cts-form-space-selector',
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
