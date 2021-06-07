/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import {
  GenericDownloader,
  ExportSelectedData,
} from '../../../../common/components/generic_downloader';
import * as i18n from '../translations';
import { TimelineType } from '../../../../../common/types/timeline';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

const ExportTimeline: React.FC<{
  exportedIds: string[] | undefined;
  getExportedData: ExportSelectedData;
  isEnableDownloader: boolean;
  onComplete?: () => void;
}> = ({ onComplete, isEnableDownloader, exportedIds, getExportedData }) => {
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

  return (
    <>
      {exportedIds != null && isEnableDownloader && (
        <GenericDownloader
          data-test-subj="export-timeline-downloader"
          exportSelectedData={getExportedData}
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          ids={exportedIds}
          onExportSuccess={onExportSuccess}
          onExportFailure={onExportFailure}
        />
      )}
    </>
  );
};
ExportTimeline.displayName = 'ExportTimeline';
export const TimelineDownloader = React.memo(ExportTimeline);
