/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiSwitch, EuiFormRow } from '@elastic/eui';
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

      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.includeRelatedFormLabel"
            defaultMessage="Include related saved objects"
          />
        }
        checked={true}
        disabled={true}
        onChange={() => {}} // noop
      />

      <EuiSpacer />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.selectSpacesLabel"
            defaultMessage="Select space(s)"
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
