/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { useDataVisualizerKibana } from '../../../kibana_context';

const docIconStyle = css({
  marginLeft: euiThemeVars.euiSizeL,
  marginTop: euiThemeVars.euiSizeXS,
});

const mainIconStyle = css({
  width: '96px',
  height: '96px',
  marginLeft: euiThemeVars.euiSizeXL,
  marginRight: euiThemeVars.euiSizeL,
});

interface Props {
  hasPermissionToImport: boolean;
}

export const WelcomeContent: FC<Props> = ({ hasPermissionToImport }) => {
  const {
    services: {
      fileUpload: { getMaxBytesFormatted, getMaxTikaBytesFormatted },
    },
  } = useDataVisualizerKibana();
  const maxFileSize = getMaxBytesFormatted();
  const maxTikaFileSize = getMaxTikaBytesFormatted();

  return (
    <EuiFlexGroup gutterSize="xl" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="xxl" type="addDataApp" css={mainIconStyle} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="xpack.dataVisualizer.file.welcomeContent.visualizeDataFromLogFileTitle"
              defaultMessage="Upload data from a file"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            {hasPermissionToImport ? (
              <>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.visualizeAndImportDataFromLogFileDescription"
                  defaultMessage="Upload your file, analyze its data, and optionally import the data into an index."
                />
                <br />
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.visualizeAndImportDataFromLogFileDescription2"
                  defaultMessage="The data can also be automatically vectorized using semantic text."
                />
              </>
            ) : (
              <FormattedMessage
                id="xpack.dataVisualizer.file.welcomeContent.visualizeDataFromLogFileDescription"
                defaultMessage="Upload your file and analyze its data."
              />
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.welcomeContent.supportedTikaFileFormatDescription"
              defaultMessage="The following file formats are supported up to {maxTikaFileSize}:"
              values={{ maxTikaFileSize }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.pdfDescription"
                  defaultMessage="PDF"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.msFilesDescription"
                  defaultMessage="Microsoft Office Word, Excel, and PowerPoint"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.plainAndRichTextFilesDescription"
                  defaultMessage="Plain text and Rich Text Format"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.openDocFilesDescription"
                  defaultMessage="Open Document Format"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.file.welcomeContent.supportedFileFormatDescription"
              defaultMessage="The following file formats are supported up to {maxFileSize}:"
              values={{ maxFileSize }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.delimitedTextFilesDescription"
                  defaultMessage="Delimited text files, such as CSV and TSV"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.newlineDelimitedJsonDescription"
                  defaultMessage="Newline-delimited JSON"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false} css={docIconStyle}>
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.welcomeContent.logFilesWithCommonFormatDescription"
                  defaultMessage="Log files with a common format for the timestamp"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
