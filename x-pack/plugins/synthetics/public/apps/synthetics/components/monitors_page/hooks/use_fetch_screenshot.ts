/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { PlaywrightOptions } from '@elastic/synthetics/dist/common_types';
// import { useFetcher } from '@kbn/observability-shared-plugin/public';
// import { format } from '@kbn/synthetics-plugin/public/apps/synthetics/components/monitor_add_edit/form/formatter';
import { TestRun } from '../../test_now_mode/test_now_mode_flyout';
// import { useSelector } from 'react-redux';
// import { useKibana } from '@kbn/kibana-react-plugin/public';
// import { v4 as uuidv4 } from 'uuid';
// import { runOnceMonitor } from '../../../state/manual_test_runs/api';
import {
  // ConfigKey,
  // EncryptedSyntheticsSavedMonitor,
  // MonitorFields as MonitorFieldsType,
  MonitorLocations,
  SyntheticsMonitor,
} from '../../../../../../common/runtime_types';
// import { selectOverviewState } from '../../../state';

export const useFetchScreenshot = ({
  monitor,
  location,
  viewport,
}: {
  monitor: SyntheticsMonitor;
  location: MonitorLocations[0];
  viewport: PlaywrightOptions['viewport'];
}) => {
  const [testRun, setTestRun] = useState<TestRun>();

  // const handleTestNow = () => {
  //   setTestRun({
  //     id: uuidv4(),
  //     name: monitor[ConfigKey.NAME],
  //     monitor,
  //   });
  // };
  //
  // const {
  //   data,
  //   loading: isPushing,
  //   error: serviceError,
  // } = useFetcher(() => {
  //   // in case of test now mode outside of form add/edit, we don't need to trigger since it's already triggered
  //   if (testRun?.id) {
  //     return runOnceMonitor({
  //       monitor: testRun.monitor,
  //       id: testRun.id,
  //     });
  //   }
  // }, [testRun?.id]);
};
