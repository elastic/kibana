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
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ComponentType } from 'react';
import styled from 'styled-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Markdown } from '@kbn/shared-ux-markdown';
import { AgentIcon } from '@kbn/custom-icons';
import {
  AgentRuntimeAttachmentProps,
  CreateAgentInstructions,
} from './agent_instructions_mappings';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import type {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyEditExtensionComponentProps,
} from '../apm_policy_form/typings';
import { AgentConfigInstructions } from '../../../tutorial/config_agent/agent_config_instructions';
import { renderMustache } from './render_mustache';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';

function AccordionButtonContent({ agentName, title }: { agentName: AgentName; title: string }) {
  return (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center">
      <EuiFlexItem grow={false}>
        <AgentIcon size="xl" agentName={agentName} role="presentation" />
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
                {i18n.translate('xpack.apm.fleet_integration.settings.apmAgent.description', {
                  defaultMessage: 'Configure instrumentation for {title} applications.',
                  values: { title },
                })}
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
    <Markdown className="euiText" readOnly>
      {markdown}
    </Markdown>
  );
}

interface Props {
  policy: PackagePolicy;
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  agentName: AgentName;
  title: string;
  variantId: string;
  createAgentInstructions: CreateAgentInstructions;
  AgentRuntimeAttachment?: ComponentType<AgentRuntimeAttachmentProps>;
}

const StyledEuiAccordion = styled(EuiAccordion)`
  // This is an alternative fix suggested by the EUI team to fix drag elements inside EuiAccordion
  // This Issue tracks the fix on the Eui side https://github.com/elastic/eui/issues/3548#issuecomment-639041283
  .euiAccordion__childWrapper {
    transform: none;
  }
`;

export function AgentInstructionsAccordion({
  policy,
  newPolicy,
  onChange,
  agentName,
  title,
  createAgentInstructions,
  variantId,
  AgentRuntimeAttachment,
}: Props) {
  const docLinks = useKibana().services.docLinks;
  const vars = newPolicy?.inputs?.[0]?.vars;
  const apmServerUrl = vars?.url.value;
  const secretToken = vars?.secret_token.value;
  const steps = createAgentInstructions(apmServerUrl, secretToken);
  const stepsElements = steps.map(
    ({ title: stepTitle, textPre, textPost, customComponentName, commands }, index) => {
      const commandBlock = commands
        ? renderMustache({
            text: commands,
            docLinks,
          })
        : '';

      return (
        <section key={index}>
          <EuiText>
            <h4>{stepTitle}</h4>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {textPre && (
              <InstructionsContent markdown={renderMustache({ text: textPre, docLinks })} />
            )}
            {commandBlock && (
              <>
                <EuiSpacer size="s" />
                <EuiCodeBlock isCopyable language="bash">
                  {commandBlock}
                </EuiCodeBlock>
              </>
            )}
            {customComponentName === 'TutorialConfigAgent' && (
              <AgentConfigInstructions
                variantId={variantId}
                apmServerUrl={apmServerUrl}
                secretToken={secretToken}
              />
            )}
            {customComponentName === 'TutorialConfigAgentRumScript' && (
              <AgentConfigInstructions
                variantId="js_script"
                apmServerUrl={apmServerUrl}
                secretToken={secretToken}
              />
            )}
            {textPost && (
              <>
                <EuiSpacer />
                <InstructionsContent markdown={renderMustache({ text: textPost, docLinks })} />
              </>
            )}
          </EuiText>
          <EuiSpacer />
        </section>
      );
    }
  );

  const manualInstrumentationContent = (
    <>
      <EuiSpacer />
      {stepsElements}
    </>
  );

  return (
    <StyledEuiAccordion
      id={agentName}
      buttonContent={<AccordionButtonContent agentName={agentName} title={title} />}
    >
      {AgentRuntimeAttachment ? (
        <>
          <EuiSpacer />
          <EuiTabbedContent
            tabs={[
              {
                id: 'manual-instrumentation',
                name: i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.manualInstrumentation',
                  { defaultMessage: 'Manual instrumentation' }
                ),
                content: manualInstrumentationContent,
              },
              {
                id: 'auto-attachment',
                name: (
                  <EuiFlexGroup justifyContent="flexStart" alignItems="baseline" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      {i18n.translate(
                        'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.autoAttachment',
                        { defaultMessage: 'Auto-Attachment' }
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <TechnicalPreviewBadge />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
                content: (
                  <>
                    <EuiSpacer />
                    <AgentRuntimeAttachment
                      policy={policy}
                      newPolicy={newPolicy}
                      onChange={onChange}
                    />
                  </>
                ),
              },
            ]}
          />
        </>
      ) : (
        manualInstrumentationContent
      )}
    </StyledEuiAccordion>
  );
}
