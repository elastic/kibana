/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './copy_to_space_form.scss';
import React from 'react';
import {
  EuiSpacer,
  EuiHorizontalRule,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CopyOptions } from '../types';
import { Space } from '../../../common/model/space';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { CopyModeControl, CopyMode } from './copy_mode_control';

interface Props {
  spaces: Space[];
  onUpdate: (copyOptions: CopyOptions) => void;
  copyOptions: CopyOptions;
}

export const CopyToSpaceForm = (props: Props) => {
  const changeCopyMode = ({ createNewCopies, overwrite }: CopyMode) =>
    props.onUpdate({ ...props.copyOptions, createNewCopies, overwrite });

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    props.onUpdate({ ...props.copyOptions, selectedSpaceIds });

  return (
    <div data-test-subj="copy-to-space-form">
      <CopyModeControl
        initialValues={props.copyOptions}
        updateSelection={(newValues: CopyMode) => changeCopyMode(newValues)}
      />

      <EuiSpacer />

      <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
        <EuiListGroupItem
          className="spcCopyToSpaceIncludeRelated"
          iconType={'check'}
          label={
            <span className="spcCopyToSpaceIncludeRelated__label">
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.includeRelatedFormLabel"
                defaultMessage="Include related saved objects"
              />
            </span>
          }
        />
      </EuiListGroup>

      <EuiHorizontalRule margin="m" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
            defaultMessage="Select spaces to copy into"
          />
        }
        fullWidth
      >
        <SelectableSpacesControl
          spaces={props.spaces}
          selectedSpaceIds={props.copyOptions.selectedSpaceIds}
          onChange={(selection) => setSelectedSpaceIds(selection)}
        />
      </EuiFormRow>
    </div>
  );
};
