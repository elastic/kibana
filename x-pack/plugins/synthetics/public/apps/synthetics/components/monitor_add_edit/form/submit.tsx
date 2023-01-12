/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Redirect, useParams, useHistory } from 'react-router-dom';
import { EuiButton, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import { RunTestButton } from './run_test_btn';
import { useMonitorSave } from '../hooks/use_monitor_save';
import { DeleteMonitor } from '../../monitors_page/management/monitor_list_table/delete_monitor';
import { ConfigKey, SourceType, SyntheticsMonitor } from '../types';
import { format } from './formatter';

import { MONITORS_ROUTE } from '../../../../../../common/constants';

export const ActionBar = () => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const history = useHistory();
  const {
    handleSubmit,
    formState: { errors, defaultValues },
  } = useFormContext();

  const [monitorPendingDeletion, setMonitorPendingDeletion] = useState<SyntheticsMonitor | null>(
    null
  );

  const [monitorData, setMonitorData] = useState<SyntheticsMonitor | undefined>(undefined);

  const { status, loading, isEdit } = useMonitorSave({ monitorData });

  const formSubmitter = (formData: Record<string, any>) => {
    if (!Object.keys(errors).length) {
      setMonitorData(format(formData));
    }
  };

  return status === FETCH_STATUS.SUCCESS ? (
    <Redirect to={MONITORS_ROUTE} />
  ) : (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          {isEdit && defaultValues && (
            <div>
              <EuiButton
                color="danger"
                onClick={() => {
                  setMonitorPendingDeletion(defaultValues as SyntheticsMonitor);
                }}
              >
                {DELETE_MONITOR_LABEL}
              </EuiButton>
            </div>
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiLink href={history.createHref({ pathname: MONITORS_ROUTE })}>{CANCEL_LABEL}</EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RunTestButton />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={loading}
            iconType="plusInCircleFilled"
            onClick={handleSubmit(formSubmitter)}
            data-test-subj="syntheticsMonitorConfigSubmitButton"
          >
            {isEdit ? UPDATE_MONITOR_LABEL : CREATE_MONITOR_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {monitorPendingDeletion && (
        <DeleteMonitor
          configId={monitorId}
          name={defaultValues?.[ConfigKey.NAME] ?? ''}
          reloadPage={() => {
            history.push(MONITORS_ROUTE);
          }}
          setMonitorPendingDeletion={setMonitorPendingDeletion}
          isProjectMonitor={defaultValues?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT}
        />
      )}
    </>
  );
};

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.discardLabel', {
  defaultMessage: 'Cancel',
});

const CREATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.addEdit.createMonitorLabel',
  {
    defaultMessage: 'Create monitor',
  }
);

const DELETE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.addEdit.deleteMonitorLabel',
  {
    defaultMessage: 'Delete monitor',
  }
);

const UPDATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.updateMonitorLabel',
  {
    defaultMessage: 'Update monitor',
  }
);
