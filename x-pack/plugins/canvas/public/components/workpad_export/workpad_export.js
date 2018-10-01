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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { Popover } from '../popover';
import { Clipboard } from '../clipboard';

class WorkpadExportUI extends React.PureComponent {
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
    const { intl } = this.props;
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.canvas.workpadExport.createPdfButtonLabel"
                  defaultMessage="Click below to create a PDF. You'll be notified when the export is complete"
                />
              }
            >
              <EuiButton
                onClick={() => {
                  this.exportPdf();
                  closePopover();
                }}
              >
                <FormattedMessage
                  id="xpack.canvas.workpadExport.exportAsPdfButtonLabel"
                  defaultMessage="Export as PDF"
                />
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="half" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.canvas.workpadExport.generatePdfLinkLabel"
              defaultMessage="To generate a PDF from a script or with Watcher, use this URL."
            />
          }
        >
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
                <EuiButtonIcon
                  aria-label={intl.formatMessage({
                    id: 'xpack.canvas.workpadExport.copyToClipboardAriaLabel',
                    defaultMessage: 'Copy to clipboard',
                  })}
                  iconType="copy"
                />
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
        <FormattedMessage
          id="xpack.canvas.workpadExport.exportToPdfIsDisabledMessage"
          defaultMessage="Export to PDF is disabled. You must configure reporting to use the Chromium browser. Add
          this to your kibana.yml file."
        />
        <EuiSpacer />
        <EuiCodeBlock paddingSize="s" language="yml">
          xpack.reporting.capture.browser.type: chromium
        </EuiCodeBlock>
      </div>
    );
  };

  render() {
    const { intl } = this.props;
    const exportControl = togglePopover => (
      <EuiButtonIcon
        iconType="exportAction"
        aria-label={intl.formatMessage({
          id: 'xpack.canvas.workpadExport.createPdfButtonAriaLabel',
          defaultMessage: 'Create PDF',
        })}
        onClick={togglePopover}
      />
    );

    return (
      <Popover
        button={exportControl}
        tooltip={this.props.intl.formatMessage({
          id: 'xpack.canvas.workpadExport.exportWorkpadButtonTooltip',
          defaultMessage: 'Export workpad',
        })}
        tooltipPosition="bottom"
      >
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

export const WorkpadExport = injectI18n(WorkpadExportUI);
