/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { SyncSavedObjectResponse, SyncResult } from '../../../../common/types/saved_objects';
import { SyncList } from './sync_list';
import { useToastNotificationService } from '../../services/toast_notification_service';

interface Props {
  onClose: () => void;
}
export const JobSpacesSyncFlyout: FC<Props> = ({ onClose }) => {
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();
  const [loading, setLoading] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [syncResp, setSyncResp] = useState<SyncSavedObjectResponse | null>(null);

  async function loadSyncList(simulate: boolean = true) {
    setLoading(true);
    try {
      const resp = await ml.savedObjects.syncSavedObjects(simulate);
      setSyncResp(resp);

      const count = Object.values(resp).reduce((acc, cur) => acc + Object.keys(cur).length, 0);
      setCanSync(count > 0);
      setLoading(false);
      return resp;
    } catch (error) {
      // this shouldn't be hit as errors are returned per-sync task
      // as part of the response
      displayErrorToast(error);
      setLoading(false);
    }
    return null;
  }

  useEffect(() => {
    loadSyncList();
  }, []);

  async function sync() {
    if (canSync) {
      // perform the sync
      const resp = await loadSyncList(false);
      // check simulate the sync again to check that all
      // items have been synchronized.
      await loadSyncList(true);

      if (resp === null) {
        return;
      }
      const { successCount, errorCount } = getResponseCounts(resp);
      if (errorCount > 0) {
        const title = i18n.translate('xpack.ml.management.syncSavedObjectsFlyout.sync.error', {
          defaultMessage: 'Some jobs or trained models cannot be synchronized.',
        });
        displayErrorToast(resp as any, title);
        return;
      }

      displaySuccessToast(
        i18n.translate('xpack.ml.management.syncSavedObjectsFlyout.sync.success', {
          defaultMessage:
            '{successCount} {successCount, plural, one {item} other {items}} synchronized',
          values: { successCount },
        })
      );
    }
  }

  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose} data-test-subj="mlJobMgmtSyncFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.management.syncSavedObjectsFlyout.headerLabel"
                defaultMessage="Synchronize saved objects"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut color="primary">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.management.syncSavedObjectsFlyout.description"
                defaultMessage="Synchronize the saved objects if they are out of sync with the machine learning jobs in Elasticsearch."
              />
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
          <SyncList syncItems={syncResp} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={onClose}
                flush="left"
                data-test-subj="mlJobMgmtSyncFlyoutCloseButton"
              >
                <FormattedMessage
                  id="xpack.ml.management.syncSavedObjectsFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={sync}
                fill
                isDisabled={canSync === false || loading === true}
                data-test-subj="mlJobMgmtSyncFlyoutSyncButton"
              >
                <FormattedMessage
                  id="xpack.ml.management.syncSavedObjectsFlyout.syncButton"
                  defaultMessage="Synchronize"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};

function getResponseCounts(resp: SyncSavedObjectResponse) {
  let successCount = 0;
  let errorCount = 0;
  Object.values(resp).forEach((result: SyncResult) => {
    Object.values(result).forEach((type) => {
      Object.values(type).forEach(({ success, error }) => {
        if (success === true) {
          successCount++;
        } else if (error !== undefined) {
          errorCount++;
        }
      });
    });
  });
  return { successCount, errorCount };
}
