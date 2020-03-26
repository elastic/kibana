/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiSwitch,
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

interface Props {
  spaces: Space[];
  onUpdate: (copyOptions: CopyOptions) => void;
  copyOptions: CopyOptions;
}

export const CopyToSpaceForm = (props: Props) => {
  const setOverwrite = (overwrite: boolean) => props.onUpdate({ ...props.copyOptions, overwrite });

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    props.onUpdate({ ...props.copyOptions, selectedSpaceIds });

  return (
    <div data-test-subj="copy-to-space-form">
      <EuiListGroup className="spcCopyToSpaceOptionsView" flush>
        <EuiListGroupItem
          className="spcCopyToSpaceIncludeRelated"
          iconType={'check'}
          label={
            <span className="spcCopyToSpaceIncludeRelated__label">
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.includeRelatedFormLabel"
                defaultMessage="Including related saved objects"
              />
            </span>
          }
        />
      </EuiListGroup>

      <EuiSpacer />

      <EuiSwitch
        data-test-subj="cts-form-overwrite"
        label={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.automaticallyOverwrite"
            defaultMessage="Automatically overwrite all saved objects"
          />
        }
        checked={props.copyOptions.overwrite}
        onChange={e => setOverwrite(e.target.checked)}
      />

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
          onChange={selection => setSelectedSpaceIds(selection)}
        />
      </EuiFormRow>
    </div>
  );
};
