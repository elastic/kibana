/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { mountReactNode } from '../../../../../../src/core/public/utils';
import { IEsError } from '../../../../../../src/plugins/data/public';
import { getScopeFromPath, useSourcererDataView } from '../containers/sourcerer';
import { useNavigateTo } from '../lib/kibana';
import { useAppToasts } from './use_app_toasts';

const ERROR_RUNTIME_FIELD_TIMELINE_EVENTS = i18n.translate(
  'xpack.securitySolution.runtimeFieldError.toastTitle',
  {
    defaultMessage: 'Runtime field error',
  }
);

const ERROR_RUNTIME_MANAGE_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.runtimeFieldError.toastButton',
  {
    defaultMessage: 'Manage Data View',
  }
);

// export const useCatchRuntimeFieldError = (dataViewId?: string) => {
export const useCatchRuntimeFieldError = () => {
  const { addWarning, api: toastsApi } = useAppToasts();
  const { navigateTo } = useNavigateTo();
  // TODO remove useSourcererDataView and use dataViewId from parameter
  const { pathname } = useLocation();
  const { dataViewId } = useSourcererDataView(getScopeFromPath(pathname));

  const catchRuntimeFieldError = useCallback(
    (error: IEsError) => {
      const runtimeFieldErrorReason = getRuntimeFieldErrorReason(error);
      if (dataViewId && runtimeFieldErrorReason) {
        const toast = addWarning({
          iconType: 'alert',
          title: ERROR_RUNTIME_FIELD_TIMELINE_EVENTS,
          toastLifeTimeMs: 300000,
          text: mountReactNode(
            <>
              <p>{runtimeFieldErrorReason}</p>
              <div className="eui-textRight">
                <EuiButton
                  size="s"
                  color="warning"
                  onClick={() => {
                    navigateTo({
                      appId: 'management',
                      path: `kibana/dataViews/dataView/${dataViewId}`,
                    });
                    toastsApi.remove(toast);
                  }}
                >
                  {ERROR_RUNTIME_MANAGE_DATA_VIEW}
                </EuiButton>
              </div>
            </>
          ),
        });
      }
    },
    [addWarning, dataViewId, navigateTo, toastsApi]
  );
  return { catchRuntimeFieldError };
};

/**
 * Returns the reason string if the error is a runtime script missing field error
 */
function getRuntimeFieldErrorReason(error: IEsError): string | null {
  const failedShards = error?.attributes?.caused_by?.failed_shards;
  if (failedShards && failedShards.length > 0) {
    const runtimeFieldFailedShard = failedShards?.find((failedShard) =>
      failedShard.reason?.caused_by?.reason?.match(`A document doesn't have a value for a field!`)
    );
    if (runtimeFieldFailedShard) {
      return runtimeFieldFailedShard?.reason?.caused_by?.reason ?? null;
    }
  }
  return null;
}
