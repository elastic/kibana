/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { useFetcher } from '@kbn/observability-plugin/public';
import { TestNowModeFlyout, TestRun } from '../../test_now_mode/test_now_mode_flyout';
import { format } from './formatter';
import {
  Locations,
  MonitorFields as MonitorFieldsType,
} from '../../../../../../common/runtime_types';
import { runOnceMonitor } from '../../../state/manual_test_runs/api';

export const RunTestButton = () => {
  const { watch, formState, getValues } = useFormContext();

  const [inProgress, setInProgress] = useState(false);
  const [testRun, setTestRun] = useState<TestRun>();

  const handleTestNow = () => {
    const config = getValues() as MonitorFieldsType;
    if (config) {
      setInProgress(true);
      setTestRun({
        id: uuidv4(),
        name: config.name,
        monitor: format(config) as MonitorFieldsType,
      });
    }
  };

  const {
    data,
    loading: isPushing,
    error: serviceError,
  } = useFetcher(() => {
    // in case of test now mode outside of form add/edit, we don't need to trigger since it's already triggered
    if (testRun?.id) {
      return runOnceMonitor({
        monitor: testRun.monitor,
        id: testRun.id,
      });
    }
  }, [testRun?.id]);

  const locations = watch('locations') as Locations;

  const { tooltipContent, isDisabled } = useTooltipContent(
    locations,
    formState.isValid,
    inProgress
  );

  return (
    <>
      <EuiToolTip key={tooltipContent} content={tooltipContent}>
        <EuiButton
          data-test-subj="syntheticsRunTestBtn"
          color="success"
          disabled={isDisabled}
          aria-label={TEST_NOW_ARIA_LABEL}
          iconType="play"
          onClick={() => {
            handleTestNow();
          }}
        >
          {RUN_TEST}
        </EuiButton>
      </EuiToolTip>
      {testRun && (
        <TestNowModeFlyout
          serviceError={serviceError}
          errors={data?.errors ?? []}
          isPushing={Boolean(isPushing)}
          testRun={testRun}
          name={testRun.name}
          inProgress={inProgress}
          onClose={() => {
            setTestRun(undefined);
            setInProgress(false);
          }}
          onDone={() => {
            setInProgress(false);
          }}
        />
      )}
    </>
  );
};

const useTooltipContent = (
  locations: Locations,
  isValid: boolean,
  isTestRunInProgress?: boolean
) => {
  const isAnyPublicLocationSelected = locations?.some((loc) => loc.isServiceManaged);
  const isOnlyPrivateLocations = (locations?.length ?? 0) > 0 && !isAnyPublicLocationSelected;

  let tooltipContent =
    isOnlyPrivateLocations || (isValid && !isAnyPublicLocationSelected)
      ? PRIVATE_AVAILABLE_LABEL
      : TEST_NOW_DESCRIPTION;

  tooltipContent = isTestRunInProgress ? TEST_SCHEDULED_LABEL : tooltipContent;

  const isDisabled = !isValid || isTestRunInProgress || !isAnyPublicLocationSelected;

  return { tooltipContent, isDisabled };
};

const TEST_NOW_DESCRIPTION = i18n.translate('xpack.synthetics.testRun.description', {
  defaultMessage: 'Test your monitor and verify the results before saving',
});

export const TEST_SCHEDULED_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.scheduled',
  {
    defaultMessage: 'Test is already scheduled',
  }
);

export const PRIVATE_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.available.private',
  {
    defaultMessage: `You can't currently test monitors running on private locations on demand.`,
  }
);

export const TEST_NOW_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.AriaLabel',
  {
    defaultMessage: 'Click to run test now',
  }
);

const RUN_TEST = i18n.translate('xpack.synthetics.monitorList.runTest.label', {
  defaultMessage: 'Run test',
});
