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
import { ShareOptions } from '../types';
import { Space } from '../../../common/model/space';
import { SelectableSpacesControl } from './selectable_spaces_control';

interface Props {
  spaces: Space[];
  onUpdate: (shareOptions: ShareOptions) => void;
  shareOptions: ShareOptions;
}

export const ShareToSpaceForm = (props: Props) => {
  const setOverwrite = (overwrite: boolean) => props.onUpdate({ ...props.shareOptions, overwrite });

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    props.onUpdate({ ...props.shareOptions, selectedSpaceIds });

  return (
    <div data-test-subj="share-to-space-form">
      <EuiListGroup className="spcShareToSpaceOptionsView" flush>
        <EuiListGroupItem
          className="spcShareToSpaceIncludeRelated"
          iconType={'check'}
          label={
            <span className="spcShareToSpaceIncludeRelated__label">
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.includeRelatedFormLabel"
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
            id="xpack.spaces.management.shareToSpace.automaticallyOverwrite"
            defaultMessage="Automatically overwrite all saved objects"
          />
        }
        checked={props.shareOptions.overwrite}
        onChange={e => setOverwrite(e.target.checked)}
      />

      <EuiHorizontalRule margin="m" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.selectSpacesLabel"
            defaultMessage="Select spaces to share into"
          />
        }
        fullWidth
      >
        <SelectableSpacesControl
          spaces={props.spaces}
          selectedSpaceIds={props.shareOptions.selectedSpaceIds}
          onChange={selection => setSelectedSpaceIds(selection)}
        />
      </EuiFormRow>
    </div>
  );
};
