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
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useEnablement } from '../../../hooks';
import { RunTestButton } from './run_test_btn';
import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import { useMonitorSave } from '../hooks/use_monitor_save';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { DeleteMonitor } from '../../monitors_page/management/monitor_list_table/delete_monitor';
import { ConfigKey, SourceType, SyntheticsMonitor } from '../types';
import { format } from './formatter';

import { MONITORS_ROUTE } from '../../../../../../common/constants';

export const ActionBar = ({
  readOnly = false,
  canUsePublicLocations = true,
}: {
  readOnly: boolean;
  canUsePublicLocations?: boolean;
}) => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const history = useHistory();
  const {
    handleSubmit,
    formState: { defaultValues, isValid },
  } = useFormContext();

  const [monitorPendingDeletion, setMonitorPendingDeletion] = useState<SyntheticsMonitor | null>(
    null
  );

  const [monitorData, setMonitorData] = useState<SyntheticsMonitor | undefined>(undefined);

  const { status, loading, isEdit } = useMonitorSave({ monitorData });

  const canEditSynthetics = useCanEditSynthetics();

  const { isServiceAllowed } = useEnablement();

  const formSubmitter = (formData: Record<string, any>) => {
    if (isValid) {
      setMonitorData(format(formData, readOnly));
    }
  };

  return status === FETCH_STATUS.SUCCESS ? (
    <Redirect to={MONITORS_ROUTE} />
  ) : (
    <>
      <EuiFlexGroup alignItems="center" wrap={true}>
        <EuiFlexItem grow={true}>
          {isEdit && defaultValues && (
            <div>
              <EuiButton
                data-test-subj="syntheticsActionBarButton"
                color="danger"
                onClick={() => {
                  setMonitorPendingDeletion(defaultValues as SyntheticsMonitor);
                }}
                isDisabled={!canEditSynthetics || !canUsePublicLocations}
              >
                {DELETE_MONITOR_LABEL}
              </EuiButton>
            </div>
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="syntheticsActionBarLink"
            href={history.createHref({ pathname: MONITORS_ROUTE })}
          >
            {CANCEL_LABEL}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RunTestButton
            canUsePublicLocations={canUsePublicLocations}
            isServiceAllowed={isServiceAllowed}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <NoPermissionsTooltip
            canEditSynthetics={canEditSynthetics}
            canUsePublicLocations={canUsePublicLocations}
          >
            <EuiButton
              fill
              isLoading={loading}
              onClick={handleSubmit(formSubmitter)}
              data-test-subj="syntheticsMonitorConfigSubmitButton"
              disabled={!canEditSynthetics || !canUsePublicLocations || !isServiceAllowed}
            >
              {isEdit ? UPDATE_MONITOR_LABEL : CREATE_MONITOR_LABEL}
            </EuiButton>
          </NoPermissionsTooltip>
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
