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
import { useReportingService, usePlatformService } from '../../../services';
import { getPages, getWorkpad } from '../../../state/selectors/workpad';
import { useDownloadWorkpad } from '../../hooks';
import { ShareMenu as ShareMenuComponent } from './share_menu.component';
import { getPdfJobParams } from './utils';

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
  const downloadWorkpad = useDownloadWorkpad();
  const reportingService = useReportingService();
  const platformService = usePlatformService();

  const { workpad, pageCount } = useSelector((state: State) => ({
    workpad: getWorkpad(state),
    pageCount: getPages(state).length,
  }));

  const ReportingPanelPDFComponent = reportingService.getReportingPanelPDFComponent();

  const sharingData = {
    workpad,
    pageCount,
  };

  const ReportingComponent =
    ReportingPanelPDFComponent !== null
      ? ({ onClose }: { onClose: () => void }) => (
          <ReportingPanelPDFComponent
            getJobParams={() => getPdfJobParams(sharingData, platformService.getKibanaVersion())}
            layoutOption="canvas"
            onClose={onClose}
            objectId={workpad.id}
          />
        )
      : null;

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

  return <ShareMenuComponent {...{ ReportingComponent, onExport }} />;
};
