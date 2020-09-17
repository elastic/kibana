/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { isFunction } from 'lodash/fp';
import * as i18n from './translations';

import { ExportDocumentsProps } from '../../../detections/containers/detection_engine/rules';
import { useStateToaster, errorToToaster } from '../toasters';

const InvisibleAnchor = styled.a`
  display: none;
`;

export type ExportSelectedData = ({
  excludeExportDetails,
  filename,
  ids,
  signal,
}: ExportDocumentsProps) => Promise<Blob>;

export interface GenericDownloaderProps {
  filename: string;
  ids?: string[];
  exportSelectedData: ExportSelectedData;
  onExportSuccess?: (exportCount: number) => void;
  onExportFailure?: () => void;
}

/**
 * Component for downloading Rules as an exported .ndjson file. Download will occur on each update to `rules` param
 *
 * @param filename of file to be downloaded
 * @param payload Rule[]
 *
 */

export const GenericDownloaderComponent = ({
  exportSelectedData,
  filename,
  ids,
  onExportSuccess,
  onExportFailure,
}: GenericDownloaderProps) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const exportData = async () => {
      if (anchorRef && anchorRef.current && ids != null && ids.length > 0) {
        try {
          const exportResponse = await exportSelectedData({
            ids,
            signal: abortCtrl.signal,
          });

          if (isSubscribed) {
            // this is for supporting IE
            if (isFunction(window.navigator.msSaveOrOpenBlob)) {
              window.navigator.msSaveBlob(exportResponse);
            } else {
              const objectURL = window.URL.createObjectURL(exportResponse);
              // These are safe-assignments as writes to anchorRef are isolated to exportData
              anchorRef.current.href = objectURL; // eslint-disable-line require-atomic-updates
              anchorRef.current.download = filename; // eslint-disable-line require-atomic-updates
              anchorRef.current.click();
              window.URL.revokeObjectURL(objectURL);
            }

            if (onExportSuccess != null) {
              onExportSuccess(ids.length);
            }
          }
        } catch (error) {
          if (isSubscribed) {
            if (onExportFailure != null) {
              onExportFailure();
            }
            errorToToaster({ title: i18n.EXPORT_FAILURE, error, dispatchToaster });
          }
        }
      }
    };

    exportData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return <InvisibleAnchor ref={anchorRef} />;
};

GenericDownloaderComponent.displayName = 'GenericDownloaderComponent';

export const GenericDownloader = React.memo(GenericDownloaderComponent);

GenericDownloader.displayName = 'GenericDownloader';
