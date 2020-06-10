/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { Clipboard } from '../../clipboard';

import { ComponentStrings } from '../../../../i18n/components';
const { WorkpadHeaderShareMenu: strings } = ComponentStrings;

interface Props {
  /** The URL that will invoke PDF Report generation. */
  pdfURL: string;
  /** Handler to invoke when the PDF is exported */
  onExport: () => void;
  /** Handler to invoke when the URL is copied to the clipboard. */
  onCopy: () => void;
}

/**
 * A panel displayed in the Export Menu with options in which to generate PDF Reports.
 */
export const PDFPanel = ({ pdfURL, onExport, onCopy }: Props) => (
  <div className="canvasShareMenu__panelContent">
    <EuiText size="s">
      <p>{strings.getPDFPanelGenerateDescription()}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <EuiButton fill onClick={onExport} size="s" style={{ width: '100%' }}>
      {strings.getPDFPanelGenerateButtonLabel()}
    </EuiButton>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>{strings.getPDFPanelCopyDescription()}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <Clipboard content={pdfURL} onCopy={onCopy}>
      <EuiButton
        iconType="copy"
        size="s"
        style={{ width: '100%' }}
        aria-label={strings.getPDFPanelCopyAriaLabel()}
      >
        {strings.getPDFPanelCopyButtonLabel()}
      </EuiButton>
    </Clipboard>
  </div>
);
