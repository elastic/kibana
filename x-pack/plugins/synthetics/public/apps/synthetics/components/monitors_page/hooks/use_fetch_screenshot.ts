/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import type { PlaywrightOptions } from '@elastic/synthetics/dist/common_types';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { TestRun } from '../../test_now_mode/test_now_mode_flyout';
import { getDecryptedMonitorAPI } from '../../../state/monitor_management/api';
import { runOnceMonitor } from '../../../state/manual_test_runs/api';
import {
  ConfigKey,
  MonitorFields as MonitorFieldsType,
} from '../../../../../../common/runtime_types';

export const useFetchScreenshot = ({
  monitor,
  locationId,
  viewport,
  basePath,
  checkGroupId,
}: {
  monitor?: MonitorFieldsType;
  locationId?: string;
  viewport: PlaywrightOptions['viewport'];
  basePath: CoreStart['http']['basePath'];
  checkGroupId?: string; // To cache retrieved image url
}) => {
  const [testRun, setTestRun] = useState<TestRun>();
  const existingPlaywrightOptions = JSON.parse(
    monitor?.[ConfigKey.PLAYWRIGHT_OPTIONS] ? monitor?.[ConfigKey.PLAYWRIGHT_OPTIONS] : '{}'
  );
  const updatedPlaywrightOptions = {
    ...existingPlaywrightOptions,
    viewport: { ...(existingPlaywrightOptions.viewport ?? {}), ...viewport },
  };

  const viewportSnapshot = JSON.stringify(viewport);
  const configId = monitor?.[ConfigKey.CONFIG_ID];
  useEffect(() => {
    if (monitor && locationId && !checkGroupId) {
      setTestRun(() => ({
        id: uuidv4(),
        name: monitor[ConfigKey.NAME],
        monitor,
      }));
    }
    // Only depend on the viewportSnapshot and not the reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportSnapshot, configId, locationId, checkGroupId]);

  const {
    data: _runOnceData,
    loading: isPushing,
    error: serviceError,
  } = useFetcher(() => {
    // in case of test now mode outside of form add/edit, we don't need to trigger since it's already triggered
    if (testRun?.id && testRun?.monitor && !checkGroupId) {
      return getDecryptedMonitorAPI({ id: testRun.monitor[ConfigKey.CONFIG_ID] }).then(
        (monitorDetails) => {
          const monitorWithViewport = {
            ...monitorDetails,
            [ConfigKey.LOCATIONS]: testRun.monitor[ConfigKey.LOCATIONS].filter(
              (loc) => loc.id === locationId
            ),
            [ConfigKey.PLAYWRIGHT_OPTIONS]: JSON.stringify(updatedPlaywrightOptions, null, 4),
          };

          return runOnceMonitor({
            monitor: monitorWithViewport,
            id: testRun.id,
          });
        }
      );
    }
  }, [testRun?.id, checkGroupId]);

  return {
    testRunId: testRun?.id,
    errorMsg: !isPushing && serviceError ? SERVICE_ERROR : undefined,
    progressMsg: isPushing ? PUSHING_LABEL : !isPushing && !serviceError ? PUSHED_LABEL : undefined,
    isDone: !isPushing,
  };
};

const PUSHING_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.pushingLabel', {
  defaultMessage: 'Pushing ...',
});

const PUSHED_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.pushedLabel', {
  defaultMessage: 'Pushed',
});

const SERVICE_ERROR = i18n.translate(
  'xpack.synthetics.monitorSelectorEmbeddable.serviceErrorLabel',
  {
    defaultMessage: 'Service error!',
  }
);
