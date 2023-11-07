/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FC, useState } from 'react';
import { ReportingModalContent, ReportingModalProps } from './reporting_modal_content';

export interface ScreenCaptureModalProps extends ReportingModalProps {
  layoutOption?: 'canvas' | 'print';
}

const renderOptions = (
  props: ScreenCaptureModalProps,
  usePrintLayout: boolean,
  handlePrintLayoutChange: (evt: EuiSwitchEvent) => void,
  useCanvasLayout: boolean,
  handleCanvasLayoutChange: (evt: EuiSwitchEvent) => void
) => {
  if (props.layoutOption === 'print') {
    return (
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingHelpText"
            defaultMessage="Uses multiple pages, showing at most 2 visualizations per page"
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingLabel"
              defaultMessage="Optimize for printing"
            />
          }
          checked={usePrintLayout}
          onChange={handlePrintLayoutChange}
          data-test-subj="usePrintLayout"
        />
      </EuiFormRow>
    );
  } else if (props.layoutOption === 'canvas') {
    return (
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="xpack.reporting.screenCapturePanelContent.canvasLayoutHelpText"
            defaultMessage="Remove borders and footer logo"
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.reporting.screenCapturePanelContent.canvasLayoutLabel"
              defaultMessage="Full page layout"
            />
          }
          checked={useCanvasLayout}
          onChange={handleCanvasLayoutChange}
          data-test-subj="reportModeToggle"
        />
      </EuiFormRow>
    );
  }
  return null;
};

const getLayout = (
  props: ScreenCaptureModalProps,
  usePrintLayout: boolean,
  useCanvasLayout: boolean
) => {
  const { layout: outerLayout } = props.getJobParams();
  let dimensions = outerLayout?.dimensions;
  if (!dimensions) {
    const el = document.querySelector('[data-shared-items-container]');
    const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
    dimensions = { height, width };
  }

  if (usePrintLayout) {
    return { id: 'print', dimensions };
  }

  if (useCanvasLayout) {
    return { id: 'canvas', dimensions };
  }

  return { id: 'preserve_layout', dimensions };
};

export const ScreenCaptureModalContent: FC<ScreenCaptureModalProps> = (
  props: ScreenCaptureModalProps
) => {
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [useCanvasLayout, setCanvasLayout] = useState(false);
  const handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(evt.target.checked);
    setCanvasLayout(false);
  };
  const handleCanvasLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(false);
    setCanvasLayout(evt.target.checked);
  };

  return (
    <ReportingModalContent
      {...props}
      layoutId={getLayout(props, usePrintLayout, useCanvasLayout).id}
      options={renderOptions(
        props,
        usePrintLayout,
        handlePrintLayoutChange,
        useCanvasLayout,
        handleCanvasLayoutChange
      )}
    />
  );
};
