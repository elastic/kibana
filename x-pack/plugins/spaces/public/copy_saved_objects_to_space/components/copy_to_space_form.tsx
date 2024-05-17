/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { SpacesDataEntry } from '../../types';
import type { CopyOptions, CopyToSpaceSavedObjectTarget } from '../types';
import type { CopyMode } from './copy_mode_control';
import { CopyModeControl } from './copy_mode_control';
import { SelectableSpacesControl } from './selectable_spaces_control';

interface Props {
  savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>;
  spaces: SpacesDataEntry[];
  onUpdate: (copyOptions: CopyOptions) => void;
  copyOptions: CopyOptions;
}

export const CopyToSpaceForm = (props: Props) => {
  const { savedObjectTarget, spaces, onUpdate, copyOptions } = props;

  // if the user is not creating new copies, prevent them from copying objects an object into a space where it already exists
  const getDisabledSpaceIds = (createNewCopies: boolean) =>
    createNewCopies
      ? new Set<string>()
      : savedObjectTarget.namespaces.reduce((acc, cur) => acc.add(cur), new Set<string>());

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

      <EuiSpacer size="m" />

      <EuiFormRow
        label={
          <EuiTitle size="xs">
            <span>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
                defaultMessage="Select spaces"
              />
            </span>
          </EuiTitle>
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
