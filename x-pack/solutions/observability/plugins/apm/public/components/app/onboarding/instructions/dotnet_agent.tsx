/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';

import { AgentConfigInstructions } from '../agent_config_instructions';
import type { AgentInstructions } from '../instruction_variants';
import { INSTRUCTION_VARIANT } from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createDotNetAgentInstructions = (commonOptions: AgentInstructions): EuiStepProps[] => {
  const {
    baseUrl,
    apmServerUrl,
    apiKeyDetails,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  } = commonOptions;
  const codeBlock = `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAllElasticApm();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.Run();`;
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.dotNet.download.title', {
        defaultMessage: 'Download the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.dotNet.download.textPre', {
              defaultMessage:
                'Add the the agent package(s) from [NuGet]({allNuGetPackagesLink}) to your .NET application. There are multiple \
      NuGet packages available for different use cases. \n\nFor an ASP.NET Core application with Entity Framework \
      Core download the [Elastic.Apm.NetCoreAll]({netCoreAllApmPackageLink}) package. This package will automatically add every \
      agent component to your application. \n\n In case you would like to minimize the dependencies, you can use the \
      [Elastic.Apm.AspNetCore]({aspNetCorePackageLink}) package for just \
      ASP.NET Core monitoring or the [Elastic.Apm.EfCore]({efCorePackageLink}) package for just Entity Framework Core monitoring. \n\n In \
      case you only want to use the public Agent API for manual instrumentation use the [Elastic.Apm]({elasticApmPackageLink}) package.',
              values: {
                allNuGetPackagesLink: 'https://www.nuget.org/packages?q=Elastic.apm',
                netCoreAllApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm.NetCoreAll',
                aspNetCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.AspNetCore',
                efCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.EntityFrameworkCore',
                elasticApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm',
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.dotNet.configureApplication.title', {
        defaultMessage: 'Add the agent to the application',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.dotNet.configureApplication.textPre', {
              defaultMessage:
                'In case of ASP.NET Core with the `Elastic.Apm.NetCoreAll` package, call the `AddAllElasticApm` \
      extension method on the `IServiceCollection` within the `Program.cs` file.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            {codeBlock}
          </EuiCodeBlock>
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.dotNet.configureApplication.textPost', {
              defaultMessage:
                'The agent will implicitly read config settings through the application’s \
      `IConfiguration` instance (e.g. from the `appsettings.json` file).',
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.dotNet.configureAgent.title', {
        defaultMessage: 'Sample appsettings.json file:',
      }),
      children: (
        <>
          {(apiKeyDetails?.displayApiKeySuccessCallout ||
            apiKeyDetails?.displayApiKeyErrorCallout) && (
            <>
              <ApiKeyCallout
                isError={apiKeyDetails?.displayApiKeyErrorCallout}
                isSuccess={apiKeyDetails?.displayApiKeySuccessCallout}
                errorMessage={apiKeyDetails?.errorMessage}
              />
              <EuiSpacer />
            </>
          )}
          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.DOTNET}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
            createApiKey={apiKeyDetails?.createAgentKey}
            createApiKeyLoading={apiKeyDetails?.createApiKeyLoading}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.dotNet.configureAgent.textPost', {
              defaultMessage:
                'You can also configure the agent through environment variables. \n \
      See [the documentation]({documentationLink}) for advanced usage, including the [Profiler Auto instrumentation]({profilerLink}) quick start.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/dotnet/current/configuration.html`,
                profilerLink: `${baseUrl}guide/en/apm/agent/dotnet/current/setup-auto-instrumentation.html#setup-auto-instrumentation`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    agentStatusCheckInstruction({
      checkAgentStatus,
      agentStatus,
      agentStatusLoading,
    }),
  ];
};
