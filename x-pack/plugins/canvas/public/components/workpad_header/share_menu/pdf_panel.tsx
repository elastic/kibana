/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Clipboard } from '../../clipboard';
import { LayoutType } from './utils';

import { ComponentStrings } from '../../../../i18n/components';
const { WorkpadHeaderShareMenu: strings } = ComponentStrings;

interface Props {
  /** Retrieve URL that will invoke PDF Report generation. */
  getPdfURL: (layout: LayoutType) => string;
  /** Handler to invoke when the PDF is exported */
  onExport: (layout: LayoutType) => void;
  /** Handler to invoke when the URL is copied to the clipboard. */
  onCopy: () => void;
}

/**
 * A panel displayed in the Export Menu with options in which to generate PDF Reports.
 */
export const PDFPanel = ({ getPdfURL, onExport, onCopy }: Props) => {
  const [reportLayout, setReportLayout] = useState<LayoutType>('preserve_layout');

  return (
    <div className="canvasShareMenu__panelContent">
      <EuiText size="s">
        <p>{strings.getPDFPanelGenerateDescription()}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTitle size="xxs">
        <h6>{strings.getPDFPanelOptionsLabel()}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow helpText={strings.getPDFFullPageLayoutHelpText()}>
        <EuiSwitch
          label={strings.getPDFFullPageLayoutLabel()}
          checked={reportLayout === 'canvas'}
          onChange={() =>
            reportLayout === 'canvas'
              ? setReportLayout('preserve_layout')
              : setReportLayout('canvas')
          }
          data-test-subj="reportModeToggle"
        />
      </EuiFormRow>
      <EuiButton
        fill
        onClick={() => onExport(reportLayout)}
        size="s"
        style={{ width: '100%' }}
        data-test-subj="generateReportButton"
      >
        {strings.getPDFPanelGenerateButtonLabel()}
      </EuiButton>
      <EuiHorizontalRule
        margin="s"
        style={{ width: 'auto', marginLeft: '-16px', marginRight: '-16px' }}
      />
      <EuiAccordion
        id="advanced-options"
        buttonContent={strings.getPDFPanelAdvancedOptionsLabel()}
        paddingSize="none"
      >
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{strings.getPDFPanelCopyDescription()}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <Clipboard content={getPdfURL(reportLayout)} onCopy={onCopy}>
          <EuiButton
            iconType="copy"
            size="s"
            style={{ width: '100%' }}
            aria-label={strings.getPDFPanelCopyAriaLabel()}
          >
            {strings.getPDFPanelCopyButtonLabel()}
          </EuiButton>
        </Clipboard>
      </EuiAccordion>
    </div>
  );
};
