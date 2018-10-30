/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCodeBlock,
  EuiHorizontalRule,
  EuiFormRow,
} from '@elastic/eui';
import { Popover } from '../popover';
import { Clipboard } from '../clipboard';

export class WorkpadExport extends React.PureComponent {
  static propTypes = {
    enabled: PropTypes.bool.isRequired,
    onCopy: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    getExportUrl: PropTypes.func.isRequired,
  };

  exportPdf = () => {
    this.props.onExport('pdf');
  };

  renderControls = closePopover => {
    const pdfUrl = this.props.getExportUrl('pdf');
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow>
            <EuiFormRow label="Click below to create a PDF. You'll be notified when the export is complete">
              <EuiButton
                onClick={() => {
                  this.exportPdf();
                  closePopover();
                }}
              >
                Export as PDF
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="half" />
        <EuiFormRow label="To generate a PDF from a script or with Watcher, use this URL.">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem style={{ overflow: 'auto' }}>
              <EuiCodeBlock style={{ whiteSpace: 'nowrap' }} paddingSize="s">
                {pdfUrl}
              </EuiCodeBlock>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <Clipboard
                content={pdfUrl}
                onCopy={() => {
                  this.props.onCopy('pdf');
                  closePopover();
                }}
              >
                <EuiButtonIcon aria-label="Copy to clipboard" iconType="copy" />
              </Clipboard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </div>
    );
  };

  renderDisabled = () => {
    return (
      <div>
        Export to PDF is disabled. You must configure reporting to use the Chromium browser. Add
        this to your kibana.yml file.
        <EuiSpacer />
        <EuiCodeBlock paddingSize="s" language="yml">
          xpack.reporting.capture.browser.type: chromium
        </EuiCodeBlock>
      </div>
    );
  };

  render() {
    const exportControl = togglePopover => (
      <EuiButtonIcon iconType="exportAction" aria-label="Create PDF" onClick={togglePopover} />
    );

    return (
      <Popover button={exportControl} tooltip="Export workpad" tooltipPosition="bottom">
        {({ closePopover }) => (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false} style={{ maxWidth: '300px' }}>
              {this.props.enabled && this.renderControls(closePopover)}
              {!this.props.enabled && this.renderDisabled()}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Popover>
    );
  }
}
