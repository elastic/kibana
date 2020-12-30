/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { ComponentStrings } from '../../../../i18n/components';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { Popover, ClosePopoverFn } from '../../popover';
import { PDFPanel } from './pdf_panel';
import { ShareWebsiteFlyout } from './flyout';
import { LayoutType } from './utils';

const { WorkpadHeaderShareMenu: strings } = ComponentStrings;

type CopyTypes = 'pdf' | 'reportingConfig';
type ExportTypes = 'pdf' | 'json';
type ExportUrlTypes = 'pdf';
type CloseTypes = 'share';

export type OnCopyFn = (type: CopyTypes) => void;
export type OnExportFn = (type: ExportTypes, layout?: LayoutType) => void;
export type OnCloseFn = (type: CloseTypes) => void;
export type GetExportUrlFn = (type: ExportUrlTypes, layout: LayoutType) => string;

export interface Props {
  /** Handler to invoke when an export URL is copied to the clipboard. */
  onCopy: OnCopyFn;
  /** Handler to invoke when an end product is exported. */
  onExport: OnExportFn;
  /** Handler to retrive an export URL based on the type of export requested. */
  getExportUrl: GetExportUrlFn;
}

/**
 * The Menu for Exporting a Workpad from Canvas.
 */
export const ShareMenu: FunctionComponent<Props> = ({ onCopy, onExport, getExportUrl }) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const onClose = () => {
    setShowFlyout(false);
  };

  const getPDFPanel = (closePopover: ClosePopoverFn) => {
    return (
      <PDFPanel
        getPdfURL={(layoutType: LayoutType) => getExportUrl('pdf', layoutType)}
        onExport={(layoutType) => {
          onExport('pdf', layoutType);
          closePopover();
        }}
        onCopy={() => {
          onCopy('pdf');
          closePopover();
        }}
      />
    );
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
      {
        name: strings.getShareDownloadPDFTitle(),
        icon: 'document',
        panel: {
          id: 1,
          title: strings.getShareDownloadPDFTitle(),
          content: getPDFPanel(closePopover),
        },
        'data-test-subj': 'sharePanel-PDFReports',
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
  });

  const shareControl = (togglePopover: React.MouseEventHandler<any>) => (
    <EuiButtonEmpty
      size="xs"
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
  onCopy: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  getExportUrl: PropTypes.func.isRequired,
};
