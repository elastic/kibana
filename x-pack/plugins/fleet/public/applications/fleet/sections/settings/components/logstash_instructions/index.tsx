/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import {
  EuiCallOut,
  EuiButton,
  EuiSpacer,
  EuiLink,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiButtonIcon,
} from '@elastic/eui';
import type { EuiCallOutProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../hooks';

import { getLogstashPipeline, LOGSTASH_CONFIG_PIPELINES } from './helpers';
import { useLogstashApiKey } from './hooks';

export const LogstashInstructions = () => {
  const { docLinks } = useStartServices();

  return (
    <CollapsibleCallout
      iconType="iInCircle"
      title={
        <FormattedMessage
          id="xpack.fleet.settings.logstashInstructions.calloutTitle"
          defaultMessage="Additional Logstash configuration required"
        />
      }
    >
      <>
        <FormattedMessage
          id="xpack.fleet.settings.logstashInstructions.description"
          defaultMessage="Add an Elastic Agent pipeline configuration to Logstash to receive events from the Elastic Agent framework.
          {documentationLink}."
          values={{
            documentationLink: (
              <EuiLink external={true} href={docLinks.links.logstash.inputElasticAgent}>
                <FormattedMessage
                  id="xpack.fleet.settings.logstashInstructions.documentationLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="m" />
        <LogstashInstructionSteps />
      </>
    </CollapsibleCallout>
  );
};

const CollapsibleCallout: React.FunctionComponent<EuiCallOutProps> = ({ children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiCallOut {...props}>
      <EuiSpacer size="s" />
      {isOpen ? (
        <EuiButton onClick={() => setIsOpen(false)}>
          <FormattedMessage
            id="xpack.fleet.settings.logstashInstructions.collapseInstructionsButtonLabel"
            defaultMessage="Collapse steps"
          />
        </EuiButton>
      ) : (
        <EuiButton onClick={() => setIsOpen(true)} fill={true}>
          <FormattedMessage
            id="xpack.fleet.settings.logstashInstructions.viewInstructionButtonLabel"
            defaultMessage="View steps"
          />
        </EuiButton>
      )}
      {isOpen && (
        <>
          <EuiSpacer size="m" />
          {children}
        </>
      )}
    </EuiCallOut>
  );
};

const LogstashInstructionSteps = () => {
  const { docLinks } = useStartServices();
  const logstashApiKey = useLogstashApiKey();

  const steps = useMemo(
    () => [
      {
        children: (
          <>
            <FormattedMessage
              id="xpack.fleet.settings.logstashInstructions.apiKeyStepDescription"
              defaultMessage="We recommend authorizing Logstash to output to Elasticsearch with minimal privileges for Elastic Agent."
            />
            <EuiSpacer size="m" />
            {logstashApiKey.apiKey ? (
              <EuiCodeBlock paddingSize="m">
                <h5>API Key</h5>
                {logstashApiKey.apiKey}

                <div className="euiCodeBlock__controls">
                  <div className="euiCodeBlock__copyButton">
                    <EuiCopy textToCopy={logstashApiKey.apiKey}>
                      {(copy) => (
                        <EuiButtonIcon
                          onClick={copy}
                          iconType="copyClipboard"
                          color="text"
                          aria-label={i18n.translate(
                            'xpack.fleet.settings.logstashInstructions.copyApiKeyButtonLabel',
                            {
                              defaultMessage: 'Copy message',
                            }
                          )}
                        />
                      )}
                    </EuiCopy>
                  </div>
                </div>
              </EuiCodeBlock>
            ) : (
              <EuiButton
                isLoading={logstashApiKey.isLoading}
                onClick={logstashApiKey.generateApiKey}
              >
                <FormattedMessage
                  id="xpack.fleet.settings.logstashInstructions.generateApiKeyButtonLabel"
                  defaultMessage="Generate API key"
                />
              </EuiButton>
            )}
            <EuiSpacer size="m" />
          </>
        ),
      },
      {
        children: (
          <>
            <FormattedMessage
              id="xpack.fleet.settings.logstashInstructions.editPipelineStepDescription"
              defaultMessage="Next, open the {pipelineConfFile} file and insert the following content:"
              values={{
                pipelineConfFile: <EuiCode>elastic-agent-pipeline.conf</EuiCode>,
              }}
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock paddingSize="m" language="yaml" isCopyable>
              {getLogstashPipeline(logstashApiKey.apiKey)}
            </EuiCodeBlock>
          </>
        ),
      },
      {
        children: (
          <>
            <FormattedMessage
              id="xpack.fleet.settings.logstashInstructions.addPipelineStepDescription"
              defaultMessage="In your Logstash configuration directory, open the {pipelineFile} file and add the following configuration. Replace the path to your file."
              values={{
                pipelineFile: <EuiCode>pipelines.yml</EuiCode>,
              }}
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock paddingSize="m" language="yaml" isCopyable>
              {LOGSTASH_CONFIG_PIPELINES}
            </EuiCodeBlock>
          </>
        ),
      },
      {
        children: (
          <>
            <FormattedMessage
              id="xpack.fleet.settings.logstashInstructions.replaceStepDescription"
              defaultMessage="Replace the parts between the brackets with your generated SSL certificate file paths. View {documentationLink} to generate the certificates."
              values={{
                documentationLink: (
                  <EuiLink external={true} href={docLinks.links.fleet.secureLogstash}>
                    <FormattedMessage
                      id="xpack.fleet.settings.logstashInstructions.ourDocumentationLink"
                      defaultMessage="our documentation"
                    />
                  </EuiLink>
                ),
              }}
            />
            <EuiSpacer size="m" />
          </>
        ),
      },
      {
        children: (
          <>
            <FormattedMessage
              id="xpack.fleet.settings.logstashInstructions.saveAndRestartStepDescription"
              defaultMessage="Save the pipeline and restart Logstash so the changes take effect."
            />
            <EuiSpacer size="m" />
          </>
        ),
      },
    ],
    [logstashApiKey, docLinks]
  );

  return (
    <ol>
      {steps.map((step, idx) => (
        <li key={idx}>{step.children}</li>
      ))}
    </ol>
  );
};
