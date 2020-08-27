/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CopyOptions } from '../types';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { CopyModeControl, CopyMode } from './copy_mode_control';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  spaces: Space[];
  onUpdate: (copyOptions: CopyOptions) => void;
  copyOptions: CopyOptions;
}

export const CopyToSpaceForm = (props: Props) => {
  const { savedObject, spaces, onUpdate, copyOptions } = props;

  // if the user is not creating new copies, prevent them from copying objects an object into a space where it already exists
  const getDisabledSpaceIds = (createNewCopies: boolean) =>
    createNewCopies
      ? new Set<string>()
      : (savedObject.namespaces ?? []).reduce((acc, cur) => acc.add(cur), new Set<string>());

  const changeCopyMode = ({ createNewCopies, overwrite }: CopyMode) => {
    const disabled = getDisabledSpaceIds(createNewCopies);
    const selectedSpaceIds = copyOptions.selectedSpaceIds.filter((x) => !disabled.has(x));
    onUpdate({ ...copyOptions, createNewCopies, overwrite, selectedSpaceIds });
  };

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    onUpdate({ ...copyOptions, selectedSpaceIds });

  return (
    <div data-test-subj="copy-to-space-form">
      <CopyModeControl
        initialValues={copyOptions}
        updateSelection={(newValues: CopyMode) => changeCopyMode(newValues)}
      />

      <EuiSpacer />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
            defaultMessage="Select space(s):"
          />
        }
        fullWidth
      >
        <SelectableSpacesControl
          spaces={spaces}
          selectedSpaceIds={copyOptions.selectedSpaceIds}
          disabledSpaceIds={getDisabledSpaceIds(copyOptions.createNewCopies)}
          onChange={(selection) => setSelectedSpaceIds(selection)}
        />
      </EuiFormRow>
    </div>
  );
};
