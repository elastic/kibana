/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiLink, EuiSpacer } from '@elastic/eui';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { fetchDeleteMonitor } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import * as labels from './labels';

export const DeleteMonitor = ({
  name,
  reloadPage,
  configId,
  isProjectMonitor,
  setMonitorPendingDeletion,
}: {
  configId: string;
  name: string;
  isProjectMonitor: boolean;
  reloadPage: () => void;
  setMonitorPendingDeletion: (val: null) => void;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    setIsDeleting(true);
  };

  const { status: monitorDeleteStatus } = useFetcher(() => {
    if (isDeleting) {
      return fetchDeleteMonitor({ configId });
    }
  }, [configId, isDeleting]);

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    if (monitorDeleteStatus === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">{labels.MONITOR_DELETE_FAILURE_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (monitorDeleteStatus === FETCH_STATUS.SUCCESS) {
      reloadPage();
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">
              {i18n.translate(
                'xpack.synthetics.monitorManagement.monitorDeleteSuccessMessage.name',
                {
                  defaultMessage: 'Deleted "{name}"',
                  values: { name },
                }
              )}
            </p>
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
      setMonitorPendingDeletion(null);
    }
  }, [setIsDeleting, isDeleting, reloadPage, monitorDeleteStatus, setMonitorPendingDeletion, name]);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.synthetics.monitorManagement.deleteMonitorNameLabel', {
        defaultMessage: 'Delete "{name}" monitor?',
        values: { name },
      })}
      onCancel={() => setMonitorPendingDeletion(null)}
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
    defaultMessage: 'Deleting this monitor will not remove it from the project source',
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
