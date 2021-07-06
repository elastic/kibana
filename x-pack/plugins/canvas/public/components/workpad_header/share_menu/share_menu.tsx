/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { State } from '../../../../types';
import { usePlatformService, useReportingService } from '../../../services';
import { getPages, getWorkpad } from '../../../state/selectors/workpad';
import { useDownloadWorkpad } from '../../hooks';
import { ShareMenu as ShareMenuComponent } from './share_menu.component';

const strings = {
  getUnknownExportErrorMessage: (type: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.unknownExportErrorMessage', {
      defaultMessage: 'Unknown export type: {type}',
      values: {
        type,
      },
    }),
};

export const ShareMenu = () => {
  const { workpad, pageCount } = useSelector((state: State) => ({
    workpad: getWorkpad(state),
    pageCount: getPages(state).length,
  }));

  const platformService = usePlatformService();
  const reportingService = useReportingService();
  const downloadWorkpad = useDownloadWorkpad();

  const sharingServices = {
    basePath: platformService.getBasePathInterface(),
    reporting: reportingService.start,
  };

  const sharingData = {
    workpad,
    pageCount,
  };

  const onExport = useCallback(
    (type: string) => {
      switch (type) {
        case 'pdf':
          // notifications are automatically handled by the Reporting plugin
          break;
        case 'json':
          downloadWorkpad(workpad.id);
          return;
        default:
          throw new Error(strings.getUnknownExportErrorMessage(type));
      }
    },
    [downloadWorkpad, workpad]
  );

  return (
    <ShareMenuComponent
      sharingServices={sharingServices}
      sharingData={sharingData}
      onExport={onExport}
    />
  );
};
