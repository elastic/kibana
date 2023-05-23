/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import { AgentConfigInstructions } from '../agent_config_instructions';
import { INSTRUCTION_VARIANT } from '../instruction_variants';
import { AgentInstructionProps } from '../tutorial_typings';

export const createDjangoAgentInstructions = (
  commonOptions: AgentInstructionProps
): EuiStepProps[] => {
  const { baseUrl, managedServiceUrl } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.django.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.django.install.textPre', {
              defaultMessage:
                'Install the APM agent for Python as a dependency.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            $ pip install elastic-apm
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.tutorial.django.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.django.configure.textPre', {
              defaultMessage:
                'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.DJANGO}
            apmServerUrl={managedServiceUrl}
            secretToken="tug"
            apiKey="tugKey"
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.django.configure.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for advanced usage.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/python/current/django-support.html`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
  ];
};
