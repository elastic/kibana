/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Popover, ClosePopoverFn } from '../../popover';
import { ReportingStart } from '../../../../../reporting/public';
import { PDF, JSON } from '../../../../i18n/constants';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { usePlatformService } from '../../../services';
import { ShareWebsiteFlyout } from './flyout';
import { CanvasWorkpadSharingData, getPdfJobParams } from './utils';

const strings = {
  getShareDownloadJSONTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareDownloadJSONTitle', {
      defaultMessage: 'Download as {JSON}',
      values: {
        JSON,
      },
    }),
  getShareDownloadPDFTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareDownloadPDFTitle', {
      defaultMessage: '{PDF} reports',
      values: {
        PDF,
      },
    }),
  getShareMenuButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareMenuButtonLabel', {
      defaultMessage: 'Share',
    }),
  getShareWebsiteTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareWebsiteTitle', {
      defaultMessage: 'Share on a website',
    }),
  getShareWorkpadMessage: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareWorkpadMessage', {
      defaultMessage: 'Share this workpad',
    }),
};

type CopyTypes = 'pdf' | 'reportingConfig';
type ExportTypes = 'pdf' | 'json';
type CloseTypes = 'share';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes) => void;
export type OnCloseFn = (type: CloseTypes) => void;

export interface Props {
  /** Canvas workpad to export as PDF **/
  sharingData: CanvasWorkpadSharingData;
  sharingServices: {
    /** Reporting dependency **/
    reporting?: ReportingStart;
  };
  /** Handler to invoke when an end product is exported. */
  onExport: OnExportFn;
}

/**
 * The Menu for Exporting a Workpad from Canvas.
 */
export const ShareMenu: FunctionComponent<Props> = ({
  sharingData,
  sharingServices: services,
  onExport,
}) => {
  const platformService = usePlatformService();
  const [showFlyout, setShowFlyout] = useState(false);

  const onClose = () => {
    setShowFlyout(false);
  };

  const getPanelTree = (closePopover: ClosePopoverFn) => ({
    id: 0,
    items: [
      {
        name: strings.getShareDownloadJSONTitle(),
        icon: <EuiIcon type="exportAction" size="m" />,
        onClick: () => {
          onExport('json');
          closePopover();
        },
      },
      services.reporting != null
        ? {
            name: strings.getShareDownloadPDFTitle(),
            icon: 'document',
            panel: {
              id: 1,
              title: strings.getShareDownloadPDFTitle(),
              content: (
                <services.reporting.components.ReportingPanelPDF
                  getJobParams={() =>
                    getPdfJobParams(sharingData, platformService.getBasePathInterface())
                  }
                  layoutOption="canvas"
                  onClose={closePopover}
                />
              ),
            },
            'data-test-subj': 'sharePanel-PDFReports',
          }
        : false,
      {
        name: strings.getShareWebsiteTitle(),
        icon: <EuiIcon type="globe" size="m" />,
        onClick: () => {
          setShowFlyout(true);
          closePopover();
        },
      },
    ].filter(Boolean),
  });

  const shareControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButtonEmpty
      size="s"
      aria-label={strings.getShareWorkpadMessage()}
      onClick={togglePopover}
      data-test-subj="shareTopNavButton"
    >
      {strings.getShareMenuButtonLabel()}
    </EuiButtonEmpty>
  );

  const flyout = showFlyout ? <ShareWebsiteFlyout onClose={onClose} /> : null;

  return (
    <div>
      <Popover button={shareControl} panelPaddingSize="none" anchorPosition="downLeft">
        {({ closePopover }: { closePopover: ClosePopoverFn }) => (
          <EuiContextMenu
            initialPanelId={0}
            panels={flattenPanelTree(getPanelTree(closePopover))}
          />
        )}
      </Popover>
      {flyout}
    </div>
  );
};

ShareMenu.propTypes = {
  onExport: PropTypes.func.isRequired,
};
