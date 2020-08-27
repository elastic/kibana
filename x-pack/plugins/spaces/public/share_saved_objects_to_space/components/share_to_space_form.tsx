/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './share_to_space_form.scss';
import React, { Fragment } from 'react';
import { EuiHorizontalRule, EuiFormRow, EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ShareOptions, SpaceTarget } from '../types';
import { SelectableSpacesControl } from './selectable_spaces_control';

interface Props {
  spaces: SpaceTarget[];
  onUpdate: (shareOptions: ShareOptions) => void;
  shareOptions: ShareOptions;
  showShareWarning: boolean;
  makeCopy: () => void;
}

export const ShareToSpaceForm = (props: Props) => {
  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    props.onUpdate({ ...props.shareOptions, selectedSpaceIds });

  const getShareWarning = () => {
    if (!props.showShareWarning) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.spaces.management.shareToSpace.shareWarningTitle"
              defaultMessage="Any changes made to one space will be reflected in all spaces."
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareWarningBody"
            defaultMessage="To avoid changes across spaces, make a copy instead."
          />
          <EuiSpacer size="s" />
          <EuiButton
            onClick={() => props.makeCopy()}
            color="warning"
            data-test-subj="sts-copy-button"
            size="s"
          >
            <FormattedMessage
              id="xpack.spaces.management.shareToSpace.shareWarningButton"
              defaultMessage="Make a copy"
            />
          </EuiButton>
        </EuiCallOut>

        <EuiHorizontalRule margin="m" />
      </Fragment>
    );
  };

  return (
    <div data-test-subj="share-to-space-form">
      {getShareWarning()}

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.selectSpacesLabel"
            defaultMessage="Select spaces to share into"
          />
        }
        labelAppend={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.selectSpacesLabelAppend"
            defaultMessage="{selectedCount} selected"
            values={{ selectedCount: props.shareOptions.selectedSpaceIds.length }}
          />
        }
        fullWidth
      >
        <SelectableSpacesControl
          spaces={props.spaces}
          selectedSpaceIds={props.shareOptions.selectedSpaceIds}
          onChange={(selection) => setSelectedSpaceIds(selection)}
        />
      </EuiFormRow>
    </div>
  );
};
