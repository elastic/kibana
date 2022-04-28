/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PDF, JSON } from '../../../../i18n/constants';
import { ClosePopoverFn, Popover } from '../../popover';
import { ShareWebsiteFlyout } from './flyout';

const strings = {
  getExportTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.exportCanvasTitle', {
      defaultMessage: 'Export',
    }),
  getShareDownloadJSONTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareDownloadJSONTitle', {
      defaultMessage: 'Export to {JSON}',
      values: {
        JSON,
      },
    }),
  getShareDownloadPDFTitle: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareDownloadPDFTitle', {
      defaultMessage: 'Export to {PDF}',
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
      defaultMessage: 'Share the workpad',
    }),
};

type CopyTypes = 'pdf' | 'reportingConfig';
type ExportTypes = 'pdf' | 'json';
type CloseTypes = 'share';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes) => void;
export type OnCloseFn = (type: CloseTypes) => void;
export type ReportingComponent = ({ onClose }: { onClose: () => void }) => JSX.Element;

export interface Props {
  ReportingComponent: ReportingComponent | null;
  onExport: OnExportFn;
}

/**
 * The Menu for Exporting a Workpad from Canvas.
 */
export const ShareMenu = ({ ReportingComponent, onExport }: Props) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const onFlyoutClose = () => {
    setShowFlyout(false);
  };

  const getPanelTree = (closePopover: ClosePopoverFn) => {
    const panelTree: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: strings.getShareWorkpadMessage(),
        items: [
          {
            name: strings.getExportTitle(),
            icon: <EuiIcon type="exportAction" size="m" />,
            panel: 1,
          },
          {
            name: strings.getShareWebsiteTitle(),
            icon: <EuiIcon type="globe" size="m" />,
            onClick: () => {
              setShowFlyout(true);
              closePopover();
            },
          },
        ],
      },
      {
        id: 1,
        title: strings.getExportTitle(),
        items: [
          {
            name: strings.getShareDownloadJSONTitle(),
            icon: <EuiIcon type="exportAction" size="m" />,
            onClick: () => {
              onExport('json');
              closePopover();
            },
          },
        ],
      },
    ];

    if (ReportingComponent !== null) {
      panelTree[1].items?.push({
        name: strings.getShareDownloadPDFTitle(),
        icon: <EuiIcon type="document" size="m" />,
        'data-test-subj': 'sharePanel-PDFReports',
        panel: 2,
      });

      panelTree.push({
        id: 2,
        title: strings.getShareDownloadPDFTitle(),
        content: <ReportingComponent onClose={closePopover} />,
      });
    }

    return panelTree;
  };

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

  const flyout = showFlyout ? <ShareWebsiteFlyout onClose={onFlyoutClose} /> : null;

  return (
    <div>
      <Popover button={shareControl} panelPaddingSize="none" anchorPosition="downLeft">
        {({ closePopover }: { closePopover: ClosePopoverFn }) => (
          <EuiContextMenu initialPanelId={0} panels={getPanelTree(closePopover)} />
        )}
      </Popover>
      {flyout}
    </div>
  );
};

ShareMenu.propTypes = {
  onExport: PropTypes.func.isRequired,
};
