/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiSpacer,
  EuiText,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateAgentInstructions } from './agent_instructions_mappings';
import {
  Markdown,
  useKibana,
} from '../../../../../../../src/plugins/kibana_react/public';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { AgentIcon } from '../../shared/agent_icon';
import { NewPackagePolicy } from '../apm_policy_form/typings';
import { getCommands } from '../../../tutorial/config_agent/commands/get_commands';
import { CopyCommands } from '../../../tutorial/config_agent/copy_commands';
import { replaceTemplateStrings } from './replace_template_strings';

function AccordionButtonContent({
  agentName,
  title,
}: {
  agentName: AgentName;
  title: string;
}) {
  return (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center">
      <EuiFlexItem grow={false}>
        <AgentIcon size="xl" agentName={agentName} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiText>
              <h4>{title}</h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.apm.fleet_integration.settings.apmAgent.description',
                  {
                    defaultMessage:
                      'Configure instrumentation for {title} applications.',
                    values: { title },
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function InstructionsContent({ markdown }: { markdown: string }) {
  return (
    <Markdown
      className="euiText"
      markdown={markdown}
      openLinksInNewTab={true}
      whiteListedRules={['backticks', 'emphasis', 'link', 'list']}
    />
  );
}

function TutorialConfigAgent({
  variantId,
  apmServerUrl,
  secretToken,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
}) {
  const commandBlock = getCommands({
    variantId,
    policyDetails: { apmServerUrl, secretToken },
  });
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem style={{ marginLeft: 'auto' }}>
        <CopyCommands commands={commandBlock} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock language="bash">{commandBlock}</EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface Props {
  newPolicy: NewPackagePolicy;
  agentName: AgentName;
  title: string;
  variantId: string;
  createAgentInstructions: CreateAgentInstructions;
}

export function AgentInstructionsAccordion({
  newPolicy,
  agentName,
  title,
  createAgentInstructions,
  variantId,
}: Props) {
  const docLinks = useKibana().services.docLinks;
  const vars = newPolicy?.inputs?.[0]?.vars;
  const apmServerUrl = vars?.url.value;
  const secretToken = vars?.secret_token.value;
  const steps = createAgentInstructions(apmServerUrl, secretToken);
  return (
    <EuiAccordion
      id={agentName}
      buttonContent={
        <AccordionButtonContent agentName={agentName} title={title} />
      }
    >
      <EuiSpacer />
      {steps.map(
        (
          {
            title: stepTitle,
            textPre,
            textPost,
            customComponentName,
            commands,
          },
          index
        ) => {
          const commandBlock = replaceTemplateStrings(
            Array.isArray(commands) ? commands.join('\n') : commands || '',
            docLinks
          );
          return (
            <section key={index}>
              <EuiText>
                <h4>{stepTitle}</h4>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="s">
                {textPre && (
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <InstructionsContent
                        markdown={replaceTemplateStrings(textPre, docLinks)}
                      />
                    </EuiFlexItem>
                    {commandBlock && (
                      <EuiFlexItem grow={false}>
                        <CopyCommands commands={commandBlock} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                )}
                {commandBlock && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="bash">{commandBlock}</EuiCodeBlock>
                  </>
                )}
                {customComponentName === 'TutorialConfigAgent' && (
                  <TutorialConfigAgent
                    variantId={variantId}
                    apmServerUrl={apmServerUrl}
                    secretToken={secretToken}
                  />
                )}
                {customComponentName === 'TutorialConfigAgentRumScript' && (
                  <TutorialConfigAgent
                    variantId="js_script"
                    apmServerUrl={apmServerUrl}
                    secretToken={secretToken}
                  />
                )}
                {textPost && (
                  <>
                    <EuiSpacer />
                    <InstructionsContent
                      markdown={replaceTemplateStrings(textPost, docLinks)}
                    />
                  </>
                )}
              </EuiText>
              <EuiSpacer />
            </section>
          );
        }
      )}
    </EuiAccordion>
  );
}
