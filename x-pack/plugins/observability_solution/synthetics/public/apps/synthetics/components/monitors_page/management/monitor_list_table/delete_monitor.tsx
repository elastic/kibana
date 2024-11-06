/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiLink, EuiSpacer } from '@elastic/eui';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { fetchDeleteMonitor } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import * as labels from './labels';

export const DeleteMonitor = ({
  name,
  reloadPage,
  configIds,
  isProjectMonitor,
  setMonitorPendingDeletion,
}: {
  configIds: string[];
  name: string;
  isProjectMonitor: boolean;
  reloadPage: () => void;
  setMonitorPendingDeletion: (val: string[]) => void;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    setIsDeleting(true);
  };

  const { status: monitorDeleteStatus } = useFetcher(() => {
    if (isDeleting) {
      return fetchDeleteMonitor({ configIds });
    }
  }, [configIds, isDeleting]);

  useEffect(() => {
    const { coreStart, toasts } = kibanaService;
    if (!isDeleting) {
      return;
    }
    if (monitorDeleteStatus === FETCH_STATUS.FAILURE) {
      toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">
              {labels.MONITOR_DELETE_FAILURE_LABEL}
            </p>,
            coreStart
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (monitorDeleteStatus === FETCH_STATUS.SUCCESS) {
      reloadPage();
      toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">
              {configIds.length === 1
                ? i18n.translate(
                    'xpack.synthetics.monitorManagement.monitorDeleteSuccessMessage.name',
                    {
                      defaultMessage: 'Deleted "{name}" monitor successfully.',
                      values: { name },
                    }
                  )
                : i18n.translate('xpack.synthetics.monitorManagement.successDeletion', {
                    defaultMessage:
                      'Deleted {monitorCount, number} {monitorCount, plural, one {monitor} other {monitors}} successfully.',
                    values: { monitorCount: configIds.length },
                  })}
            </p>,
            coreStart
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    }
    if (
      monitorDeleteStatus === FETCH_STATUS.SUCCESS ||
      monitorDeleteStatus === FETCH_STATUS.FAILURE
    ) {
      setIsDeleting(false);
      setMonitorPendingDeletion([]);
    }
  }, [
    setIsDeleting,
    isDeleting,
    reloadPage,
    monitorDeleteStatus,
    setMonitorPendingDeletion,
    name,
    configIds.length,
  ]);

  return (
    <EuiConfirmModal
      title={
        configIds.length === 1
          ? i18n.translate('xpack.synthetics.monitorManagement.deleteMonitorNameLabel', {
              defaultMessage: 'Delete "{name}" monitor?',
              values: { name },
            })
          : i18n.translate('xpack.synthetics.monitorManagement.deleteMonitorNameLabel', {
              defaultMessage:
                'Delete {monitorCount, number} selected {monitorCount, plural, one {monitor} other {monitors}}?',
              values: { monitorCount: configIds.length },
            })
      }
      onCancel={() => setMonitorPendingDeletion([])}
      onConfirm={handleConfirmDelete}
      cancelButtonText={labels.NO_LABEL}
      confirmButtonText={labels.YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isDeleting}
    >
      {isProjectMonitor && (
        <>
          <EuiCallOut color="warning" title={PROJECT_MONITOR_TITLE}>
            <p>
              <ProjectMonitorDisclaimer />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
    </EuiConfirmModal>
  );
};

export const PROJECT_MONITOR_TITLE = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorList.disclaimer.title',
  {
    defaultMessage: 'Deleting project monitor will not remove it from the project source',
  }
);

export const ProjectMonitorDisclaimer = () => {
  return (
    <FormattedMessage
      id="xpack.synthetics.monitorManagement.monitorList.disclaimer.label"
      defaultMessage="To delete it completely and stop it from being pushed again in the future, delete it from the project source. {docsLink}."
      values={{
        docsLink: (
          <EuiLink
            data-test-subj="syntheticsProjectMonitorDisclaimerLearnMoreLink"
            href="https://elastic.co/guide/en/observability/current/synthetics-manage-monitors.html#manage-monitors-delete"
            target="_blank"
          >
            {i18n.translate('xpack.synthetics.monitorManagement.projectDelete.docsLink', {
              defaultMessage: 'Learn more',
            })}
          </EuiLink>
        ),
      }}
    />
  );
};
