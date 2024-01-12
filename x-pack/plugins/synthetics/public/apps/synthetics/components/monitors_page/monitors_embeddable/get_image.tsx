/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useEffect, useMemo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import {
  MonitorFields as MonitorFieldsType,
  SyntheticsMonitor,
} from '../../../../../../common/runtime_types';
import { useRetrieveStepImage } from '../../common/monitor_test_result/use_retrieve_step_image';
import { getScreenshotUrl } from '../../common/screenshot/journey_screenshot_dialog';
import { useBrowserRunOnceMonitors } from '../../test_now_mode/hooks/use_browser_run_once_monitors';
import { useFetchScreenshot } from '../hooks/use_fetch_screenshot';
import { MonitorSelectorState } from './models';

export const GetImage = ({
  checkGroupId,
  basePath,
  monitor,
  state,
  onClick,
  onCheckGroupIdRetrieved,
  onImgUrlRetrieved,
}: {
  checkGroupId?: string;
  basePath: CoreStart['http']['basePath'];
  monitor?: SyntheticsMonitor;
  state: MonitorSelectorState;
  onClick: (evt: MouseEvent<HTMLButtonElement>) => void;
  onCheckGroupIdRetrieved: (imgPath: string) => void;
  onImgUrlRetrieved: (imgUrl: string) => void;
}) => {
  const { monitorId, locationId, wMax, height } = state;
  const [progressStatus, setProgressStatus] = useState<ImageProgress>({ isDone: true });
  const [testRunId, setTestRunId] = useState<string | undefined>();

  const fetchResult = useFetchScreenshot({
    checkGroupId,
    monitor: monitor as MonitorFieldsType | undefined,
    locationId,
    basePath,
    viewport: { width: wMax, height },
  });

  useEffect(() => {
    if (!checkGroupId) {
      setTestRunId(undefined);
    }
  }, [checkGroupId]);

  useEffect(() => {
    if (fetchResult.testRunId) {
      setTestRunId(fetchResult.testRunId);
    }
  }, [fetchResult?.testRunId]);

  useEffect(() => {
    handleProgress(fetchResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchResult?.isDone, fetchResult?.progressMsg, fetchResult?.errorMsg]);

  const handleCheckGroupRetrieve = useCallback(
    (newCheckGroupId: string) => {
      if (newCheckGroupId) {
        onCheckGroupIdRetrieved(newCheckGroupId);
      }
    },
    [onCheckGroupIdRetrieved]
  );

  const handleOnImageUrlRetrieve = useCallback(
    (checkGroupResult: { url: string }) => {
      if (checkGroupResult.url) {
        onImgUrlRetrieved(checkGroupResult.url);
      }
    },
    [onImgUrlRetrieved]
  );

  const handleProgress = useCallback(
    (progress: ImageProgress) => {
      setProgressStatus({
        progressMsg: progress.progressMsg,
        errorMsg: progress.errorMsg,
        isDone: progress.isDone,
      });
    },
    [setProgressStatus]
  );

  return (
    <>
      {testRunId ? (
        <RetrieveCheckGroup
          testRunId={testRunId}
          onCheckGroupRetrieved={handleCheckGroupRetrieve}
          onCheckGroupProgress={handleProgress}
        />
      ) : null}
      {checkGroupId ? (
        <RetrieveImageUrl
          checkGroupId={checkGroupId}
          basePath={basePath}
          onImageResult={handleOnImageUrlRetrieve}
          onImageRetrieveProgress={handleProgress}
        />
      ) : null}
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiText
            size="xs"
            css={{ whiteSpace: 'nowrap' }}
            color={progressStatus.errorMsg ? 'danger' : 'dimgray'}
          >
            {progressStatus.errorMsg || progressStatus.progressMsg}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="syntheticsUpdateMonitorScreenshot"
            disabled={
              !monitorId || !locationId || (!progressStatus.isDone && !progressStatus.errorMsg)
            }
            onClick={onClick}
            color={!!progressStatus.errorMsg ? 'danger' : undefined}
            iconType="download"
            aria-label={UPDATE_SCREENSHOT_LABEL}
            title={UPDATE_SCREENSHOT_LABEL}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const UPDATE_SCREENSHOT_LABEL = i18n.translate(
  'xpack.synthetics.monitorSelectorEmbeddable.updateScreenshotLabel',
  {
    defaultMessage: 'Update screenshot',
  }
);

type ImageResult = ReturnType<typeof useRetrieveStepImage>;
type CheckGroupResult = ImageResult[keyof ImageResult];
export const RetrieveImageUrl = ({
  checkGroupId,
  basePath,
  onImageResult,
  onImageRetrieveProgress,
}: {
  checkGroupId: string;
  basePath: CoreStart['http']['basePath'];
  onImageResult: (result: CheckGroupResult) => void;
  onImageRetrieveProgress: (args: ImageProgress) => void;
}) => {
  const imgPath = useMemo(() => {
    return getScreenshotUrl({
      basePath: basePath.serverBasePath,
      checkGroup: checkGroupId,
      stepNumber: 1,
    });
  }, [checkGroupId, basePath.serverBasePath]);

  const imageResult = useRetrieveStepImage({
    hasIntersected: true,
    stepStatus: 'complete',
    imgPath,
    retryFetchOnRevisit: false,
    checkGroup: checkGroupId,
    testNowMode: true,
  });

  const imagePathResult = imageResult?.[imgPath];
  useEffect(() => {
    if (imagePathResult) {
      onImageRetrieveProgress({
        progressMsg: imagePathResult?.loading ? CREATING_LABEL : undefined,
        errorMsg: undefined,
        isDone: !!imagePathResult?.url,
      });
    }
  }, [onImageRetrieveProgress, imagePathResult]);

  useEffect(() => {
    if (checkGroupId && imgPath && imageResult && imagePathResult) {
      onImageResult(imagePathResult as CheckGroupResult);
    }
  }, [onImageResult, checkGroupId, imgPath, imagePathResult, imageResult]);

  return <></>;
};

export const RetrieveCheckGroup = ({
  testRunId,
  onCheckGroupRetrieved,
  onCheckGroupProgress,
}: {
  testRunId: string;
  onCheckGroupRetrieved: (checkGroupId: string) => void;
  onCheckGroupProgress: (args: ImageProgress) => void;
}) => {
  const {
    retriesExceeded,
    summariesLoading,
    expectedSummariesLoaded,
    stepLoadingInProgress,
    checkGroupResults,
  } = useBrowserRunOnceMonitors({
    testRunId,
    expectSummaryDocs: testRunId ? 1 : 0,
  });

  const { journeyStarted, summaryDoc } = checkGroupResults[0] ?? {
    journeyStarted: true,
    summaryDoc: null,
  };

  const isInProgress = journeyStarted && (stepLoadingInProgress || summariesLoading);
  const progressMsg =
    (stepLoadingInProgress && journeyStarted) || (!summariesLoading && !expectedSummariesLoaded)
      ? RUNNING_LABEL
      : !isInProgress && summaryDoc?.monitor?.status === 'up'
      ? SUCCESSFUL_LABEL
      : summariesLoading
      ? RETRIEVING_LABEL
      : undefined;

  useEffect(() => {
    onCheckGroupProgress({
      progressMsg,
      errorMsg: retriesExceeded ? TIMED_OUT_LABEL : undefined,
      isDone: expectedSummariesLoaded,
    });
  }, [onCheckGroupProgress, progressMsg, expectedSummariesLoaded, retriesExceeded]);

  useEffect(() => {
    if (
      testRunId &&
      expectedSummariesLoaded &&
      !stepLoadingInProgress &&
      checkGroupResults[0]?.checkGroupId
    ) {
      onCheckGroupRetrieved(checkGroupResults[0]?.checkGroupId);
    }
  }, [
    onCheckGroupRetrieved,
    testRunId,
    retriesExceeded,
    summariesLoading,
    expectedSummariesLoaded,
    stepLoadingInProgress,
    checkGroupResults,
  ]);

  return <></>;
};

interface ImageProgress {
  progressMsg?: string;
  errorMsg?: string;
  isDone: boolean;
}

const RUNNING_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.runningLabel', {
  defaultMessage: 'Running ...',
});

const SUCCESSFUL_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.runningLabel', {
  defaultMessage: 'Test successful!',
});

const RETRIEVING_LABEL = i18n.translate(
  'xpack.synthetics.monitorSelectorEmbeddable.retrievingLabel',
  {
    defaultMessage: 'Retrieving ...',
  }
);

const CREATING_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.creatingLabel', {
  defaultMessage: 'Creating ...',
});

const TIMED_OUT_LABEL = i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.timedOutLabel', {
  defaultMessage: 'Timed out!',
});
