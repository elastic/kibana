/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import * as i18n from '../translations';
import { TimelineType } from '../../../../../common/api/timeline';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { exportSelectedTimeline } from '../../../containers/api';
import { downloadBlob } from '../../../../common/utils/download_blob';

const ExportTimeline: React.FC<{
  exportedIds: string[] | undefined;
  isEnableDownloader: boolean;
  onComplete?: () => void;
}> = ({ onComplete, isEnableDownloader, exportedIds }) => {
  const { tabName: timelineType } = useParams<{ tabName: TimelineType }>();
  const { addSuccess } = useAppToasts();

  const onExportSuccess = useCallback(
    (exportCount) => {
      if (onComplete != null) {
        onComplete();
      }

      addSuccess({
        title:
          timelineType === TimelineType.template
            ? i18n.SUCCESSFULLY_EXPORTED_TIMELINE_TEMPLATES(exportCount)
            : i18n.SUCCESSFULLY_EXPORTED_TIMELINES(exportCount),
        'data-test-subj': 'addObjectToContainerSuccess',
      });
    },
    [addSuccess, onComplete, timelineType]
  );
  const onExportFailure = useCallback(() => {
    if (onComplete != null) {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    const downloadTimeline = async () => {
      if (exportedIds?.length && isEnableDownloader) {
        const result = await exportSelectedTimeline({ ids: exportedIds });
        if (result instanceof Blob) {
          downloadBlob(result, `${i18n.EXPORT_FILENAME}.ndjson`);
          onExportSuccess(exportedIds.length);
        } else {
          onExportFailure();
        }
      }
    };

    downloadTimeline();
    // We probably don't need to have ExportTimeline in the form of a React component.
    // See https://github.com/elastic/kibana/issues/101571 for more detail.
    // But for now, it uses isEnableDownloader as a signal to start downloading.
    // Other variables are excluded from the deps array to avoid false positives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportedIds, isEnableDownloader]);

  return null;
};
ExportTimeline.displayName = 'ExportTimeline';
export const TimelineDownloader = React.memo(ExportTimeline);
