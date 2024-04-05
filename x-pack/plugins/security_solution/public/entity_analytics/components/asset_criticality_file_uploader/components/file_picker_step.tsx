/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFilePicker,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { euiThemeVars } from '@kbn/ui-theme';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';
import {
  MAX_FILE_SIZE,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_TYPES,
  VALID_CRITICALITY_LEVELS,
} from '../constants';

interface AssetCriticalityFilePickerStepProps {
  onFileChange: (fileList: FileList | null) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const sampleCSVContent = `identifier,criticality,type\nuser-001,low_impact,user\nuser-002,medium_impact,user\nhost-001,extreme_impact,host`;

const listStyle = css`
  list-style-type: disc;
  margin-bottom: ${euiThemeVars.euiSizeL};
  margin-left: ${euiThemeVars.euiSizeL};
  line-height: ${euiThemeVars.euiLineHeight};
`;

export const AssetCriticalityFilePickerStep: React.FC<AssetCriticalityFilePickerStepProps> = ({
  onFileChange,
  errorMessage,
  isLoading,
}) => {
  const formatBytes = useFormatBytes();
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel color={'subdued'} paddingSize="l" grow={false} hasShadow={false}>
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              defaultMessage={'CSV File Format Requirements'}
              id={
                'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.csvFileFormatRequirements'
              }
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ul className={listStyle}>
          <li>
            <FormattedMessage
              defaultMessage="Supported file formats: {formats}"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.acceptedFileFormats"
              values={{
                formats: SUPPORTED_FILE_EXTENSIONS.join(', '),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              defaultMessage={'You can upload file up to {maxFileSize}'}
              id={
                'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.uploadFileSizeLimit'
              }
              values={{
                maxFileSize: formatBytes(MAX_FILE_SIZE),
              }}
            />
          </li>
        </ul>

        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              defaultMessage={'Required CSV Structure'}
              id={
                'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.CSVStructureTitle'
              }
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ul className={listStyle}>
          <li>
            {
              <FormattedMessage
                defaultMessage={
                  'Identifier: The unique identifier for each asset {hostName} or {userName}.'
                }
                id={
                  'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetIdentifierDescription'
                }
                values={{
                  hostName: <b>{'Host.name'}</b>,
                  userName: <b>{'User.name'}</b>,
                }}
              />
            }
          </li>
          <li>
            <FormattedMessage
              defaultMessage="Criticality label: Use any of these labels: {labels}"
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetCriticalityLabels"
              values={{
                labels: <b>{VALID_CRITICALITY_LEVELS.join(', ')}</b>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              defaultMessage="Resource Type: Indicate whether the resource is a {host} or a {user}."
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetTypeDescription"
              values={{
                host: <b>{'host'}</b>,
                user: <b>{'user'}</b>,
              }}
            />
          </li>
        </ul>

        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              defaultMessage={'Example'}
              id={'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.exampleTitle'}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          language="csv"
          css={css`
            background-color: ${euiTheme.colors.ghost};
          `}
          paddingSize="s"
          lineNumbers
          isCopyable
        >
          {sampleCSVContent}
        </EuiCodeBlock>
      </EuiPanel>

      <EuiSpacer size="l" />
      <EuiFilePicker
        accept={SUPPORTED_FILE_TYPES.join(',')}
        fullWidth
        onChange={onFileChange}
        isInvalid={!!errorMessage}
        isLoading={isLoading}
      />
      <br />
      {errorMessage && <div>{errorMessage}</div>}
    </>
  );
};
