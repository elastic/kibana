/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useLayoutEffect, useCallback } from 'react';
import { usePromise } from 'react-use';
import { History } from 'history';

import { i18n } from '@kbn/i18n';
import { ToastsStart } from 'src/core/public';

// @ts-ignore
import { UpgradeFailure } from './components/upgrade_failure';
// @ts-ignore
import { PipelineEditor } from './components/pipeline_editor';
// @ts-ignore
import { Pipeline } from '../models/pipeline';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
// @ts-ignore
import * as Breadcrumbs from './breadcrumbs';

const usePipeline = (
  pipelineService: any,
  logstashLicenseService: any,
  toasts: ToastsStart,
  shouldClone: boolean,
  id?: string
) => {
  const mounted = usePromise();
  const [pipeline, setPipeline] = useState<any>(null);

  useLayoutEffect(() => {
    (async () => {
      if (!id) {
        return setPipeline(new Pipeline());
      }

      try {
        const result = await mounted(pipelineService.loadPipeline(id) as Promise<any>);
        setPipeline(shouldClone ? result.clone : result);
      } catch (e) {
        await logstashLicenseService.checkValidity();
        if (e.status !== 403) {
          toasts.addDanger(
            i18n.translate('xpack.logstash.couldNotLoadPipelineErrorNotification', {
              defaultMessage: `Couldn't load pipeline. Error: '{errStatusText}'.`,
              values: {
                errStatusText: e.statusText,
              },
            })
          );
        }
      }
    })();
  }, [pipelineService, id, mounted, shouldClone, logstashLicenseService, toasts]);

  return pipeline;
};

const useIsUpgraded = (upgradeService: any) => {
  const [isUpgraded, setIsUpgraded] = useState<null | boolean>(null);
  const mounted = usePromise();

  useLayoutEffect(() => {
    mounted(upgradeService.executeUpgrade() as Promise<boolean>).then((result) =>
      setIsUpgraded(result)
    );
  }, [mounted, upgradeService]);

  return isUpgraded;
};

interface EditProps {
  pipelineService: any;
  logstashLicenseService: any;
  upgradeService: any;
  toasts: ToastsStart;
  history: History;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];

  // URL params
  id?: string;
}

export const PipelineEditView: React.FC<EditProps> = ({
  pipelineService,
  logstashLicenseService,
  upgradeService,
  toasts,
  history,
  setBreadcrumbs,
  id,
}) => {
  const params = new URLSearchParams(history.location.search);
  const shouldRetry = params.get('retry') === 'true';
  const shouldClone = params.get('clone') === '';

  const pipeline = usePipeline(pipelineService, logstashLicenseService, toasts, shouldClone, id);
  const isUpgraded = useIsUpgraded(upgradeService);

  const onRetry = useCallback(() => {
    const newParams = new URLSearchParams(history.location.search);
    newParams.set('retry', 'true');
    history.replace({ search: newParams.toString() });
  }, [history]);
  const close = useCallback(() => {
    history.push('/');
  }, [history]);
  const open = useCallback(
    (newId: string) => {
      history.push(`/pipeline/${newId}/edit`);
    },
    [history]
  );

  if (!pipeline || isUpgraded === null) {
    return null;
  }

  const isNewPipeline = !pipeline.id;
  setBreadcrumbs(
    isNewPipeline
      ? Breadcrumbs.getPipelineCreateBreadcrumbs()
      : Breadcrumbs.getPipelineEditBreadcrumbs(pipeline.id)
  );

  if (!isUpgraded) {
    return (
      <UpgradeFailure
        isNewPipeline={isNewPipeline}
        isManualUpgrade={!!shouldRetry}
        onRetry={onRetry}
        onClose={close}
      />
    );
  }

  return (
    <PipelineEditor
      id={id}
      clone={shouldClone}
      close={close}
      open={open}
      isNewPipeline={isNewPipeline}
      pipeline={pipeline}
      pipelineService={pipelineService}
      toastNotifications={toasts}
      licenseService={logstashLicenseService}
    />
  );
};
