/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { difference, xor } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
} from '@elastic/eui';

import { JobType, SavedObjectResult } from '../../../../common/types/saved_objects';
import { ml } from '../../services/ml_api_service';
import { useToastNotificationService } from '../../services/toast_notification_service';

import { SpacesSelector } from './spaces_selectors';

interface Props {
  jobId: string;
  jobType: JobType;
  spaceIds: string[];
  onClose: () => void;
}
export const JobSpacesFlyout: FC<Props> = ({ jobId, jobType, spaceIds, onClose }) => {
  const { displayErrorToast } = useToastNotificationService();

  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>(spaceIds);
  const [saving, setSaving] = useState(false);
  const [savable, setSavable] = useState(false);
  const [canEditSpaces, setCanEditSpaces] = useState(false);

  useEffect(() => {
    const different = xor(selectedSpaceIds, spaceIds).length !== 0;
    setSavable(different === true && selectedSpaceIds.length > 0);
  }, [selectedSpaceIds.length]);

  async function applySpaces() {
    if (savable) {
      setSaving(true);
      const addedSpaces = difference(selectedSpaceIds, spaceIds);
      const removedSpaces = difference(spaceIds, selectedSpaceIds);
      if (addedSpaces.length) {
        const resp = await ml.savedObjects.assignJobToSpace(jobType, [jobId], addedSpaces);
        handleApplySpaces(resp);
      }
      if (removedSpaces.length) {
        const resp = await ml.savedObjects.removeJobFromSpace(jobType, [jobId], removedSpaces);
        handleApplySpaces(resp);
      }
      onClose();
    }
  }

  function handleApplySpaces(resp: SavedObjectResult) {
    Object.entries(resp).forEach(([id, { success, error }]) => {
      if (success === false) {
        const title = i18n.translate(
          'xpack.ml.management.spacesSelectorFlyout.updateSpaces.error',
          {
            defaultMessage: 'Error updating {id}',
            values: { id },
          }
        );
        displayErrorToast(error, title);
      }
    });
  }

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.management.spacesSelectorFlyout.headerLabel"
                defaultMessage="Select spaces for {jobId}"
                values={{ jobId }}
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SpacesSelector
            jobId={jobId}
            spaceIds={spaceIds}
            selectedSpaceIds={selectedSpaceIds}
            setSelectedSpaceIds={setSelectedSpaceIds}
            canEditSpaces={canEditSpaces}
            setCanEditSpaces={setCanEditSpaces}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.ml.management.spacesSelectorFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={applySpaces}
                fill
                isDisabled={canEditSpaces === false || savable === false || saving === true}
              >
                <FormattedMessage
                  id="xpack.ml.management.spacesSelectorFlyout.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
