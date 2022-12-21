/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../../hooks';
import type { DownloadSource } from '../../../../types';
import { DownloadSourceTable } from '../download_source_table';

export interface AgentBinarySectionProps {
  downloadSources: DownloadSource[];
  deleteDownloadSource: (ds: DownloadSource) => void;
}

export const AgentBinarySection: React.FunctionComponent<AgentBinarySectionProps> = ({
  downloadSources,
  deleteDownloadSource,
}) => {
  const { getHref } = useLink();

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            id="xpack.fleet.settings.downloadSourcesSection.Title"
            defaultMessage="Agent Binary Download"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="m">
        <FormattedMessage
          id="xpack.fleet.settings.downloadSourcesSection.Subtitle"
          defaultMessage="Specify where the agents will download their binary from. Checked default will apply to all policies unless overwritten."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <DownloadSourceTable
        downloadSources={downloadSources}
        deleteDownloadSource={deleteDownloadSource}
      />
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        href={getHref('settings_create_download_sources')}
        data-test-subj="addDownloadSourcesBtn"
      >
        <FormattedMessage
          id="xpack.fleet.settings.downloadSourcesSection.CreateButtonLabel"
          defaultMessage="Add agent binary source"
        />
      </EuiButtonEmpty>
    </>
  );
};
