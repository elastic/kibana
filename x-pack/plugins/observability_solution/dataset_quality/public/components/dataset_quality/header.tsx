/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiLink, EuiPageHeader, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_LOGS_DATA_VIEW } from '../../../common/constants';
import { datasetQualityAppTitle } from '../../../common/translations';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Header() {
  return (
    <EuiPageHeader
      bottomBorder
      pageTitle={
        <>
          {datasetQualityAppTitle}
          &nbsp;
          <EuiBetaBadge
            label={betaBadgeLabel}
            title={betaBadgeLabel}
            tooltipContent={betaBadgeDescription}
          />
        </>
      }
      description={
        <FormattedMessage
          id="xpack.datasetQuality.appDescription"
          defaultMessage="Monitor the data set quality for {logsPattern} data streams that follow the {dsNamingSchemeLink}."
          values={{
            logsPattern: <EuiCode>{DEFAULT_LOGS_DATA_VIEW}</EuiCode>,
            dsNamingSchemeLink: (
              <EuiLink
                data-test-subj="datasetQualityAppDescriptionDsNamingSchemeLink"
                href="https://ela.st/data-stream-naming-scheme"
                target="_blank"
                rel="noopener"
              >
                <FormattedMessage
                  id="xpack.datasetQuality.appDescription.dsNamingSchemeLinkText"
                  defaultMessage="Data stream naming scheme"
                />
              </EuiLink>
            ),
          }}
        />
      }
    />
  );
}

const betaBadgeLabel = i18n.translate('xpack.datasetQuality.betaBadgeLabel', {
  defaultMessage: 'Beta',
});

const betaBadgeDescription = i18n.translate('xpack.datasetQuality.betaBadgeDescription', {
  defaultMessage:
    'This feature is currently in beta. If you encounter any bugs or have feedback, we’d love to hear from you. Please open a support issue and/or visit our discussion forum.',
});
