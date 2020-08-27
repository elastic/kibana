/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './selectable_spaces_control.scss';
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSelectable, EuiSelectableOption, EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../../../common/model/space';

interface Props {
  spaces: Space[];
  selectedSpaceIds: string[];
  disabledSpaceIds: Set<string>;
  onChange: (selectedSpaceIds: string[]) => void;
  disabled?: boolean;
}

type SpaceOption = EuiSelectableOption & { ['data-space-id']: string };

export const SelectableSpacesControl = (props: Props) => {
  if (props.spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const disabledIndicator = (
    <EuiIconTip
      content={
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.selectSpacesControl.disabledTooltip"
          defaultMessage="The object already exists in this space and cannot be copied here"
        />
      }
      position="left"
      type="iInCircle"
    />
  );

  const options = props.spaces.map<SpaceOption>((space) => {
    const disabled = props.disabledSpaceIds.has(space.id);
    return {
      label: space.name,
      prepend: <SpaceAvatar space={space} size={'s'} />,
      append: disabled ? disabledIndicator : null,
      checked: props.selectedSpaceIds.includes(space.id) ? 'on' : undefined,
      disabled,
      ['data-space-id']: space.id,
      ['data-test-subj']: `cts-space-selector-row-${space.id}`,
    };
  });

  function updateSelectedSpaces(selectedOptions: SpaceOption[]) {
    if (props.disabled) return;

    const selectedSpaceIds = selectedOptions
      .filter((opt) => opt.checked)
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
