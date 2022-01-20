/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiSteps,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiLink,
  EuiCode,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CanvasRenderedWorkpad } from '../../../../../shareable_runtime/types';
import { useDownloadRenderedWorkpad } from '../../../hooks';
import { useDownloadRuntime, useDownloadZippedRuntime } from './hooks';
import { ZIP, CANVAS, HTML } from '../../../../../i18n/constants';
import { OnCloseFn } from '../share_menu.component';
import { WorkpadStep } from './workpad_step';
import { RuntimeStep } from './runtime_step';
import { SnippetsStep } from './snippets_step';
import { useNotifyService } from '../../../../services';

const strings = {
  getCopyShareConfigMessage: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.copyShareConfigMessage', {
      defaultMessage: 'Copied share markup to clipboard',
    }),
  getUnknownExportErrorMessage: (type: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.unknownExportErrorMessage', {
      defaultMessage: 'Unknown export type: {type}',
      values: {
        type,
      },
    }),
  getRuntimeStepTitle: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.downloadRuntimeTitle', {
      defaultMessage: 'Download runtime',
    }),
  getSnippentsStepTitle: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.addSnippetsTitle', {
      defaultMessage: 'Add snippets to website',
    }),
  getStepsDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.description', {
      defaultMessage:
        'Follow these steps to share a static version of this workpad on an external website. It will be a visual snapshot of the current workpad, and will not have access to live data.',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.flyoutTitle', {
      defaultMessage: 'Share on a website',
    }),
  getUnsupportedRendererWarning: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.unsupportedRendererWarning', {
      defaultMessage:
        'This workpad contains render functions that are not supported by the {CANVAS} Shareable Workpad Runtime. These elements will not be rendered:',
      values: {
        CANVAS,
      },
    }),
  getWorkpadStepTitle: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.downloadWorkpadTitle', {
      defaultMessage: 'Download workpad',
    }),
};

export type OnDownloadFn = (type: 'share' | 'shareRuntime' | 'shareZip') => void;
export type OnCopyFn = () => void;

export interface Props {
  onClose: OnCloseFn;
  unsupportedRenderers?: string[];
  renderedWorkpad: CanvasRenderedWorkpad;
}

const steps = (onDownload: OnDownloadFn, onCopy: OnCopyFn) => [
  {
    title: strings.getWorkpadStepTitle(),
    children: <WorkpadStep {...{ onDownload }} />,
  },
  {
    title: strings.getRuntimeStepTitle(),
    children: <RuntimeStep {...{ onDownload }} />,
  },
  {
    title: strings.getSnippentsStepTitle(),
    children: <SnippetsStep {...{ onCopy }} />,
  },
];

export const ShareWebsiteFlyout: FC<Props> = ({
  onClose,
  unsupportedRenderers,
  renderedWorkpad,
}) => {
  const notifyService = useNotifyService();

  const onCopy = useCallback(
    () => notifyService.info(strings.getCopyShareConfigMessage()),
    [notifyService]
  );

  const downloadRenderedWorkpad = useDownloadRenderedWorkpad();
  const downloadRuntime = useDownloadRuntime();
  const downloadZippedRuntime = useDownloadZippedRuntime();

  const onDownload = useCallback(
    (type: 'share' | 'shareRuntime' | 'shareZip') => {
      switch (type) {
        case 'share':
          downloadRenderedWorkpad(renderedWorkpad);
          return;
        case 'shareRuntime':
          downloadRuntime();
          return;
        case 'shareZip':
          downloadZippedRuntime(renderedWorkpad);
          return;
        default:
          throw new Error(strings.getUnknownExportErrorMessage(type));
      }
    },
    [downloadRenderedWorkpad, downloadRuntime, downloadZippedRuntime, renderedWorkpad]
  );

  const link = (
    <EuiLink
      style={{ textDecoration: 'underline' }}
      onClick={() => {
        onDownload('shareZip');
      }}
    >
      <FormattedMessage
        id="xpack.canvas.shareWebsiteFlyout.zipDownloadLinkLabel"
        defaultMessage="download an example {ZIP} file"
        values={{ ZIP }}
      />
    </EuiLink>
  );

  const title = (
    <div>
      <FormattedMessage
        id="xpack.canvas.shareWebsiteFlyout.flyoutCalloutDescription"
        defaultMessage="To try sharing, you can {link} containing this workpad, the {CANVAS} Shareable Workpad runtime, and a sample {HTML} file."
        values={{
          CANVAS,
          HTML,
          link,
        }}
      />
    </div>
  );

  let warningText = null;

  if (unsupportedRenderers && unsupportedRenderers.length > 0) {
    const warning = [
      <EuiText size="s" key="text">
        <span>{strings.getUnsupportedRendererWarning()}</span>
        {unsupportedRenderers.map((fn, index) => [
          <EuiCode key={`item-${index}`}>{fn}</EuiCode>,
          index < unsupportedRenderers.length - 1 ? ', ' : '',
        ])}
      </EuiText>,
      <EuiSpacer size="xs" key="spacer" />,
    ];
    warningText = [
      <EuiCallOut title={warning} color="warning" size="s" iconType="alert" key="callout" />,
      <EuiSpacer key="spacer" />,
    ];
  }

  return (
    <EuiFlyout onClose={() => onClose('share')} maxWidth>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <EuiFlexGroup alignItems="center">
            <h2 id="flyoutTitle">
              <EuiFlexItem grow={false}>{strings.getTitle()}</EuiFlexItem>
            </h2>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge label="Beta" color="accent" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{strings.getStepsDescription()}</p>
        </EuiText>
        <EuiSpacer />
        <EuiCallOut size="s" title={title} iconType="iInCircle" />
        <EuiSpacer />
        {warningText}
        <EuiSteps steps={steps(onDownload, onCopy)} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
