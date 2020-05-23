/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiText,
  EuiSwitch,
  EuiLink,
  EuiIcon,
  EuiLoadingSpinner,
  EuiIconTip,
} from '@elastic/eui';
import { useTestConfigContext } from '../../test_config_context';

interface Props {
  executeOutput?: { docs: object[] };
  handleExecute: (documents: object[], verbose: boolean) => void;
  isExecuting: boolean;
}

export const OutputTab: React.FunctionComponent<Props> = ({
  executeOutput,
  handleExecute,
  isExecuting,
}) => {
  const { setCurrentTestConfig, testConfig } = useTestConfigContext();
  const { verbose: cachedVerbose, documents: cachedDocuments } = testConfig;

  const onEnableVerbose = (isVerboseEnabled: boolean) => {
    setCurrentTestConfig({
      ...testConfig,
      verbose: isVerboseEnabled,
    });

    handleExecute(cachedDocuments!, isVerboseEnabled);
  };

  let content: React.ReactNode | undefined;

  if (isExecuting) {
    content = <EuiLoadingSpinner size="m" />;
  } else if (executeOutput) {
    content = (
      <EuiCodeBlock language="json" isCopyable>
        {JSON.stringify(executeOutput, null, 2)}
      </EuiCodeBlock>
    );
  }

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.outputTab.descriptionText"
            defaultMessage="The output of the executed pipeline. {runLink}"
            values={{
              runLink: (
                <EuiLink onClick={() => handleExecute(cachedDocuments!, cachedVerbose)}>
                  <FormattedMessage
                    id="xpack.ingestPipelines.testPipelineFlyout.outputTab.descriptionLinkLabel"
                    defaultMessage="Refresh output"
                  />{' '}
                  <EuiIcon type="refresh" />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiSwitch
        label={
          <>
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.outputTab.verboseSwitchLabel"
              defaultMessage="View verbose output"
            />{' '}
            <EuiIconTip
              content={
                <FormattedMessage
                  id="xpack.ingestPipelines.testPipelineFlyout.outputTab.verboseSwitchTooltipLabel"
                  defaultMessage="Include output data for each processor in the executed pipeline response"
                />
              }
            />
          </>
        }
        checked={cachedVerbose}
        onChange={e => onEnableVerbose(e.target.checked)}
      />

      <EuiSpacer size="m" />

      {content}
    </>
  );
};
