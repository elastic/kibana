/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { EuiSelectable, EuiLoadingSpinner } from '@elastic/eui';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../../../common/model/space';

interface Props {
  spaces: Space[];
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
  disabled?: boolean;
}

interface SpaceOption {
  label: string;
  prepend?: any;
  checked: 'on' | 'off' | null;
  ['data-space-id']: string;
  disabled?: boolean;
}

export const SelectableSpacesControl = (props: Props) => {
  const [options, setOptions] = useState<SpaceOption[]>([]);

  //  TODO: update once https://github.com/elastic/eui/issues/2071 is fixed
  if (options.length === 0) {
    setOptions(
      props.spaces.map(space => ({
        label: space.name,
        prepend: <SpaceAvatar space={space} size={'s'} />,
        checked: props.selectedSpaceIds.includes(space.id) ? 'on' : null,
        ['data-space-id']: space.id,
        ['data-test-subj']: `cts-space-selector-row-${space.id}`,
      }))
    );
  }

  function updateSelectedSpaces(selectedOptions: SpaceOption[]) {
    if (props.disabled) return;

    const selectedSpaceIds = selectedOptions
      .filter(opt => opt.checked)
      .map(opt => opt['data-space-id']);

    props.onChange(selectedSpaceIds);
    // TODO: remove once https://github.com/elastic/eui/issues/2071 is fixed
    setOptions(selectedOptions);
  }

  if (options.length === 0) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiSelectable
      options={options as any[]}
      onChange={newOptions => updateSelectedSpaces(newOptions as SpaceOption[])}
      listProps={{
        bordered: true,
        rowHeight: 40,
        className: 'spcCopyToSpace__spacesList',
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
