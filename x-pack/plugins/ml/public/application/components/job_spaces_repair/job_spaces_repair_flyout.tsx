/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiText,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import { ml } from '../../services/ml_api_service';
import {
  RepairSavedObjectResponse,
  SavedObjectResult,
} from '../../../../common/types/saved_objects';
import { RepairList } from './repair_list';
import { useToastNotificationService } from '../../services/toast_notification_service';

interface Props {
  onClose: () => void;
}
export const JobSpacesRepairFlyout: FC<Props> = ({ onClose }) => {
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();
  const [loading, setLoading] = useState(false);
  const [repairable, setRepairable] = useState(false);
  const [repairResp, setRepairResp] = useState<RepairSavedObjectResponse | null>(null);

  async function loadRepairList(simulate: boolean = true) {
    setLoading(true);
    try {
      const resp = await ml.savedObjects.repairSavedObjects(simulate);
      setRepairResp(resp);

      const count = Object.values(resp).reduce((acc, cur) => acc + Object.keys(cur).length, 0);
      setRepairable(count > 0);
      setLoading(false);
      return resp;
    } catch (error) {
      // this shouldn't be hit as errors are returned per-repair task
      // as part of the response
      displayErrorToast(error);
      setLoading(false);
    }
    return null;
  }

  useEffect(() => {
    loadRepairList();
  }, []);

  async function repair() {
    if (repairable) {
      // perform the repair
      const resp = await loadRepairList(false);
      // check simulate the repair again to check that all
      // items have been repaired.
      await loadRepairList(true);

      if (resp === null) {
        return;
      }
      const { successCount, errorCount } = getResponseCounts(resp);
      if (errorCount > 0) {
        const title = i18n.translate('xpack.ml.management.repairSavedObjectsFlyout.repair.error', {
          defaultMessage: 'Some jobs cannot be repaired.',
        });
        displayErrorToast(resp as any, title);
        return;
      }

      displaySuccessToast(
        i18n.translate('xpack.ml.management.repairSavedObjectsFlyout.repair.success', {
          defaultMessage: '{successCount} {successCount, plural, one {job} other {jobs}} repaired',
          values: { successCount },
        })
      );
    }
  }

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.management.repairSavedObjectsFlyout.headerLabel"
                defaultMessage="Repair saved objects"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut color="primary">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.management.repairSavedObjectsFlyout.description"
                defaultMessage="Repair the saved objects if they are out of sync with the machine learning jobs in Elasticsearch."
              />
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
          <RepairList repairItems={repairResp} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.ml.management.repairSavedObjectsFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={repair}
                fill
                isDisabled={repairable === false || loading === true}
              >
                <FormattedMessage
                  id="xpack.ml.management.repairSavedObjectsFlyout.repairButton"
                  defaultMessage="Repair"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};

function getResponseCounts(resp: RepairSavedObjectResponse) {
  let successCount = 0;
  let errorCount = 0;
  Object.values(resp).forEach((result: SavedObjectResult) => {
    Object.values(result).forEach(({ success, error }) => {
      if (success === true) {
        successCount++;
      } else if (error !== undefined) {
        errorCount++;
      }
    });
  });
  return { successCount, errorCount };
}
