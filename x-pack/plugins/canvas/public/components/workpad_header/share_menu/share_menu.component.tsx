/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenu, EuiIcon } from '@elastic/eui';
import { IBasePath } from 'kibana/public';
import PropTypes from 'prop-types';
import React, { FunctionComponent, useState } from 'react';
import { ReportingStart } from '../../../../../reporting/public';
import { ComponentStrings } from '../../../../i18n/components';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { ClosePopoverFn, Popover } from '../../popover';
import { ShareWebsiteFlyout } from './flyout';
import { CanvasWorkpadSharingData, getPdfJobParams } from './utils';

const { WorkpadHeaderShareMenu: strings } = ComponentStrings;

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
    /** BasePath dependency **/
    basePath: IBasePath;
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
                  getJobParams={() => getPdfJobParams(sharingData, services.basePath)}
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
  onExport: PropTypes.func.isRequired,
};
