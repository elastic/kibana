/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { ExperimentalBadge } from '../experimental_badge';

import { useDataVisualizerKibana } from '../../../kibana_context';

export const WelcomeContent: FC = () => {
  const toolTipContent = i18n.translate(
    'xpack.fileDataVisualizer.welcomeContent.experimentalFeatureTooltip',
    {
      defaultMessage: "Experimental feature. We'd love to hear your feedback.",
    }
  );

  const {
    services: {
      fileUpload: { getMaxBytesFormatted },
    },
  } = useDataVisualizerKibana();
  const maxFileSize = getMaxBytesFormatted();

  return (
    <EuiFlexGroup gutterSize="xl" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="xxl" type="addDataApp" className="file-datavisualizer-about-panel__icon" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="xpack.fileDataVisualizer.welcomeContent.visualizeDataFromLogFileTitle"
              defaultMessage="Visualize data from a log file&nbsp;{experimentalBadge}"
              values={{
                experimentalBadge: <ExperimentalBadge tooltipContent={toolTipContent} />,
              }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fileDataVisualizer.welcomeContent.visualizeDataFromLogFileDescription"
              defaultMessage="The File Data Visualizer helps you understand the fields and metrics in a log file.
              Upload your file, analyze its data, and then choose whether to import the data into an Elasticsearch index."
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fileDataVisualizer.welcomeContent.supportedFileFormatDescription"
              defaultMessage="The File Data Visualizer supports these file formats:"
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.fileDataVisualizer.welcomeContent.delimitedTextFilesDescription"
                  defaultMessage="Delimited text files, such as CSV and TSV"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.fileDataVisualizer.welcomeContent.newlineDelimitedJsonDescription"
                  defaultMessage="Newline-delimited JSON"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.fileDataVisualizer.welcomeContent.logFilesWithCommonFormatDescription"
                  defaultMessage="Log files with a common format for the timestamp"
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fileDataVisualizer.welcomeContent.uploadedFilesAllowedSizeDescription"
              defaultMessage="You can upload files up to {maxFileSize}."
              values={{ maxFileSize }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fileDataVisualizer.welcomeContent.experimentalFeatureDescription"
              defaultMessage="This feature is experimental. Got feedback? Please create an issue in&nbsp;{githubLink}."
              values={{
                githubLink: (
                  <EuiLink
                    href="https://github.com/elastic/kibana/issues/new/choose"
                    target="_blank"
                  >
                    GitHub
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
