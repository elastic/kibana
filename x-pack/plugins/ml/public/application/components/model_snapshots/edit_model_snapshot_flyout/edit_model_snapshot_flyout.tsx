/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTextArea,
  EuiFormRow,
  EuiSwitch,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCallOut,
} from '@elastic/eui';

import {
  ModelSnapshot,
  CombinedJobWithStats,
} from '../../../../../common/types/anomaly_detection_jobs';
import { ml } from '../../../services/ml_api_service';
import { useNotifications } from '../../../contexts/kibana';

interface Props {
  snapshot: ModelSnapshot;
  job: CombinedJobWithStats;
  closeFlyout(reload: boolean): void;
}

export const EditModelSnapshotFlyout: FC<Props> = ({ snapshot, job, closeFlyout }) => {
  const { toasts } = useNotifications();
  const [description, setDescription] = useState(snapshot.description);
  const [retain, setRetain] = useState(snapshot.retain);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const isCurrentSnapshot = snapshot.snapshot_id === job.model_snapshot_id;

  async function updateSnapshot() {
    try {
      await ml.updateModelSnapshot(snapshot.job_id, snapshot.snapshot_id, {
        description,
        retain,
      });
      closeWithReload();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.newJob.wizard.editModelSnapshotFlyout.saveErrorTitle', {
          defaultMessage: 'Model snapshot update failed',
        }),
      });
    }
  }

  async function deleteSnapshot() {
    try {
      await ml.deleteModelSnapshot(snapshot.job_id, snapshot.snapshot_id);
      hideDeleteModal();
      closeWithReload();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.newJob.wizard.editModelSnapshotFlyout.saveErrorTitle', {
          defaultMessage: 'Model snapshot deletion failed',
        }),
      });
    }
  }

  function closeWithReload() {
    closeFlyout(true);
  }
  function closeWithoutReload() {
    closeFlyout(false);
  }
  function showDeleteModal() {
    setDeleteModalVisible(true);
  }
  function hideDeleteModal() {
    setDeleteModalVisible(false);
  }

  return (
    <>
      <EuiFlyout onClose={closeWithoutReload} hideCloseButton size="m">
        <EuiFlyoutBody>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h5>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.editModelSnapshotFlyout.title"
                  defaultMessage="Edit snapshot {ssId}"
                  values={{ ssId: snapshot.snapshot_id }}
                />
              </h5>
            </EuiTitle>

            {isCurrentSnapshot && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut size="s" title="Current snapshot">
                  This is the current snapshot being used by job THING and so cannot be deleted.
                </EuiCallOut>
              </>
            )}

            <EuiSpacer size="l" />

            <EuiFormRow label="Description" fullWidth>
              <EuiTextArea
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow fullWidth>
              <EuiSwitch
                label="Retain snapshot during automatic snapshot cleanup process"
                checked={retain}
                onChange={(e) => setRetain(e.target.checked)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeWithoutReload} flush="left">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={true} />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={showDeleteModal}
                color="danger"
                disabled={isCurrentSnapshot === true}
              >
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.useDefaultButton"
                  defaultMessage="Delete"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={updateSnapshot} fill>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {deleteModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title="Delete snapshot?"
            onCancel={hideDeleteModal}
            onConfirm={deleteSnapshot}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton="confirm"
          />
        </EuiOverlayMask>
      )}
    </>
  );
};
