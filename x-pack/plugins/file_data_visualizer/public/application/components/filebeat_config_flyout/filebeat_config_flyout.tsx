/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiCodeBlock,
  EuiCode,
  EuiCopy,
} from '@elastic/eui';
import { createFilebeatConfig } from './filebeat_config';
import { useFileDataVisualizerKibana } from '../../kibana_context'; // copy context?
import { FindFileStructureResponse } from '../../../../../file_upload/common';

export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  index: string;
  results: FindFileStructureResponse;
  indexPatternId: string;
  ingestPipelineId: string;
  closeFlyout(): void;
}
export const FilebeatConfigFlyout: FC<Props> = ({
  index,
  results,
  indexPatternId,
  ingestPipelineId,
  closeFlyout,
}) => {
  const [fileBeatConfig, setFileBeatConfig] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const {
    services: { security },
  } = useFileDataVisualizerKibana();

  useEffect(() => {
    if (security !== undefined) {
      security.authc.getCurrentUser().then((user) => {
        setUsername(user.username === undefined ? null : user.username);
      });
    }
  }, [security]);

  useEffect(() => {
    const config = createFilebeatConfig(index, results, ingestPipelineId, username);
    setFileBeatConfig(config);
  }, [username, index, ingestPipelineId, results]);

  return (
    <EuiFlyout onClose={closeFlyout} hideCloseButton size={'m'}>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <Contents value={fileBeatConfig} username={username} index={index} />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.fileDataVisualizer.fileBeatConfigFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={fileBeatConfig}>
              {(copy) => (
                <EuiButton onClick={copy}>
                  <FormattedMessage
                    id="xpack.fileDataVisualizer.fileBeatConfigFlyout.copyButton"
                    defaultMessage="Copy to clipboard"
                  />
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const Contents: FC<{
  value: string;
  index: string;
  username: string | null;
}> = ({ value, index, username }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfigTitle"
            defaultMessage="Filebeat configuration"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <p>
        <FormattedMessage
          id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfigTopText1"
          defaultMessage="Additional data can be uploaded to the {index} index using Filebeat."
          values={{ index: <EuiCode>{index}</EuiCode> }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfigTopText2"
          defaultMessage="Modify {filebeatYml} to set the connection information:"
          values={{ filebeatYml: <EuiCode>filebeat.yml</EuiCode> }}
        />
      </p>

      <EuiSpacer size="s" />

      <EuiCodeBlock language="bash">{value}</EuiCodeBlock>

      <EuiSpacer size="s" />
      <p>
        {username === null ? (
          <FormattedMessage
            id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfigBottomTextNoUsername"
            defaultMessage="Where {esUrl} is the URL of Elasticsearch."
            values={{
              esUrl: <EuiCode>{'<es_url>'}</EuiCode>,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfigBottomText"
            defaultMessage="Where {password} is the password of the {user} user, {esUrl} is the URL of Elasticsearch."
            values={{
              user: <EuiCode>{username}</EuiCode>,
              password: <EuiCode>{'<password>'}</EuiCode>,
              esUrl: <EuiCode>{'<es_url>'}</EuiCode>,
            }}
          />
        )}
      </p>
    </EuiFlexItem>
  );
};
