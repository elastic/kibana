/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiCodeBlock,
  EuiFilePicker,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { euiThemeVars } from '@kbn/ui-theme';
import {
  CRITICALITY_CSV_MAX_SIZE_BYTES,
  ValidCriticalityLevels,
} from '../../../../../common/entity_analytics/asset_criticality';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';
import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from '../constants';

interface AssetCriticalityFilePickerStepProps {
  onFileChange: (fileList: FileList | null) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const sampleCSVContent = `user,user-001,low_impact\nuser,user-002,medium_impact\nhost,host-001,extreme_impact`;

const listStyle = css`
  list-style-type: disc;
  margin-bottom: ${euiThemeVars.euiSizeL};
  margin-left: ${euiThemeVars.euiSizeL};
  line-height: ${euiThemeVars.euiLineHeight};
`;

export const AssetCriticalityFilePickerStep: React.FC<AssetCriticalityFilePickerStepProps> =
  React.memo(({ onFileChange, errorMessage, isLoading }) => {
    const formatBytes = useFormatBytes();
    const { euiTheme } = useEuiTheme();
    return (
      <>
        <EuiSpacer size="m" />
        <EuiPanel color={'subdued'} paddingSize="l" grow={false} hasShadow={false}>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Supported file formats and size"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.csvFileFormatRequirements"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="File formats: {formats}"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.acceptedFileFormats"
                values={{
                  formats: SUPPORTED_FILE_EXTENSIONS.join(', '),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Maximum file size: {maxFileSize}"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.uploadFileSizeLimit"
                values={{
                  maxFileSize: formatBytes(CRITICALITY_CSV_MAX_SIZE_BYTES),
                }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Required file structure"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.CSVStructureTitle"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="Entity type: Indicate whether the entity is a {host} or a {user}."
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetTypeDescription"
                values={{
                  host: <b>{'host'}</b>,
                  user: <b>{'user'}</b>,
                }}
              />
            </li>
            <li>
              {
                <FormattedMessage
                  defaultMessage="Identifier: Specify the entity's {hostName} or {userName}."
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetIdentifierDescription"
                  values={{
                    hostName: <b>{'host.name'}</b>,
                    userName: <b>{'user.name'}</b>,
                  }}
                />
              }
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Criticality level: Specify any one of {labels}"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.assetCriticalityLabels"
                values={{
                  labels: <EuiCode>{ValidCriticalityLevels.join(', ')}</EuiCode>,
                }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Example"
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.exampleTitle"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="csv"
            css={css`
              background-color: ${euiTheme.colors.emptyShade};
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
          data-test-subj="asset-criticality-file-picker"
          accept={SUPPORTED_FILE_TYPES.join(',')}
          fullWidth
          onChange={onFileChange}
          isInvalid={!!errorMessage}
          isLoading={isLoading}
        />
        <br />
        {errorMessage && (
          <EuiText color={'danger'} size="xs">
            {errorMessage}
          </EuiText>
        )}
      </>
    );
  });

AssetCriticalityFilePickerStep.displayName = 'AssetCriticalityFilePickerStep';
