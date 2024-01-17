/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
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
  const overlays = platformService.getOverlays();
  const theme = platformService.getTheme();
  const i18nStart = platformService.getI18n();

  const { workpad, pageCount } = useSelector((state: State) => ({
    workpad: getWorkpad(state),
    pageCount: getPages(state).length,
  }));

  const ReportingModalComponent =
    reportingService.getReportingModalContent !== null
      ? reportingService.getReportingModalContent({ onClose: () => {}, objectType: 'Canvas' })
      : () => {};

  const sharingData = {
    workpad,
    pageCount,
  };

  const openReportingModal =
    ReportingModalComponent !== null
      ? () => {
          const session = overlays.openModal(
            toMountPoint(
              // @ts-ignore
              <ReportingModalComponent
                layoutOption="canvas"
                onClose={() => session.close()}
                objectId={workpad.id}
                objectType="Canvas"
                getJobParams={getPdfJobParams(sharingData, platformService.getKibanaVersion())}
              />,
              { theme, i18n: i18nStart }
            ),
            {
              maxWidth: 400,
            }
          );
        }
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

  return openReportingModal !== null ? (
    <ShareMenuComponent {...{ openReportingModal, onExport }} />
  ) : null;
};
