/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const createNodeAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.nodeClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.nodeClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Node.js as a dependency to your application.',
    }),
    commands: ['npm install elastic-apm-node --save'],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.nodeClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.nodeClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `serviceName`. \
This agent supports a variety of frameworks but can also be used with your custom stack.',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.nodeClient.configure.textPost', {
      defaultMessage:
        'See [the documentation]({documentationLink}) for advanced usage, including how to use with \
[Babel/ES Modules]({babelEsModulesLink}).',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/current/index.html',
        babelEsModulesLink:
          '{config.docs.base_url}guide/en/apm/agent/nodejs/current/advanced-setup.html#es-modules',
      },
    }),
  },
];

export const createDjangoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.djangoClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.djangoClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm'],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.djangoClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.djangoClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.djangoClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/python/current/django-support.html',
      },
    }),
  },
];

export const createFlaskAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.flaskClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.flaskClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm[flask]'],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.flaskClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.flaskClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.flaskClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/python/current/flask-support.html',
      },
    }),
  },
];

export const createRailsAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.railsClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.railsClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.railsClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.railsClient.configure.textPre', {
      defaultMessage:
        'APM is automatically started when your app boots. Configure the agent, by creating the config file {configFile}',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.railsClient.configure.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html',
      },
    }),
  },
];

export const createRackAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.rackClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.rackClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.rackClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.rackClient.configure.textPre', {
      defaultMessage:
        'For Rack or a compatible framework (e.g. Sinatra), include the middleware in your app and start the agent.',
    }),
    commands: `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # ${i18n.translate(
      'xpack.apm.tutorial.rackClient.configure.commands.requiredComment',
      {
        defaultMessage: 'required',
      }
    )}
    config_file: '' # ${i18n.translate(
      'xpack.apm.tutorial.rackClient.configure.commands.optionalComment',
      {
        defaultMessage: 'optional, defaults to config/elastic_apm.yml',
      }
    )}
  )

  run MySinatraApp

  at_exit {curlyOpen} ElasticAPM.stop {curlyClose}`.split('\n'),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.rackClient.createConfig.title', {
      defaultMessage: 'Create config file',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.rackClient.createConfig.textPre', {
      defaultMessage: 'Create a config file {configFile}:',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.rackClient.createConfig.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html',
      },
    }),
  },
];

export const createJsAgentInstructions = (apmServerUrl = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.jsClient.enableRealUserMonitoring.title', {
      defaultMessage: 'Enable Real User Monitoring support in APM Server',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.jsClient.enableRealUserMonitoring.textPre', {
      defaultMessage:
        'APM Server disables RUM support by default. See the [documentation]({documentationLink}) \
for details on how to enable RUM support. When using the APM integration with Fleet, RUM support is automatically enabled.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/guide/{config.docs.version}/configuration-rum.html',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.jsClient.installDependency.title', {
      defaultMessage: 'Set up the Agent as a dependency',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.jsClient.installDependency.textPre', {
      defaultMessage:
        'You can install the Agent as a dependency to your application with \
`npm install @elastic/apm-rum --save`.\n\n\
The Agent can then be initialized and configured in your application like this:',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.jsClient.installDependency.textPost', {
      defaultMessage:
        'Framework integrations, like React or Angular, have custom dependencies. \
See the [integration documentation]({docLink}) for more information.',
      values: {
        docLink:
          '{config.docs.base_url}guide/en/apm/agent/rum-js/current/framework-integrations.html',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.jsClient.scriptTags.title', {
      defaultMessage: 'Set up the Agent with Script Tags',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.jsClient.scriptTags.textPre', {
      defaultMessage:
        "Alternatively, you can use Script tags to set up and configure the Agent. \
Add a `<script>` tag to the HTML page and use the `elasticApm` global object to load and initialize the agent. \
Don't forget to download the latest version of the RUM Agent from [GitHub]({GitHubLink}) or [UNPKG]({UnpkgLink}), \
and host the file on your Server/CDN before deploying to production.",
      values: {
        GitHubLink: 'https://github.com/elastic/apm-agent-rum-js/releases/latest',
        UnpkgLink: 'https://unpkg.com/@elastic/apm-rum/dist/bundles/elastic-apm-rum.umd.min.js',
      },
      ignoreTag: true,
    }),
    customComponentName: 'TutorialConfigAgentRumScript',
  },
];

export const createGoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.goClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.goClient.install.textPre', {
      defaultMessage: 'Install the APM agent packages for Go.',
    }),
    commands: ['go get go.elastic.co/apm'],
  },
  {
    title: i18n.translate('xpack.apm.tutorial.goClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.goClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the executable \
file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.goClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced configuration.',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/configuration.html',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.goClient.instrument.title', {
      defaultMessage: 'Instrument your application',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.goClient.instrument.textPre', {
      defaultMessage:
        'Instrument your Go application by using one of the provided instrumentation modules or \
by using the tracer API directly.',
    }),
    commands: `\
import (
	"net/http"

	"go.elastic.co/apm/module/apmhttp"
)

func main() {curlyOpen}
	mux := http.NewServeMux()
	...
	http.ListenAndServe(":8080", apmhttp.Wrap(mux))
{curlyClose}
`.split('\n'),
    textPost: i18n.translate('xpack.apm.tutorial.goClient.instrument.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for a detailed \
guide to instrumenting Go source code.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/go/current/instrumenting-source.html',
      },
    }),
  },
];

export const createJavaAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.javaClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.javaClient.download.textPre', {
      defaultMessage:
        'Download the agent jar from [Maven Central]({mavenCentralLink}). \
Do **not** add the agent as a dependency to your application.',
      values: {
        mavenCentralLink:
          'https://oss.sonatype.org/service/local/artifact/maven/redirect?r=releases&g=co.elastic.apm&a=elastic-apm-agent&v=LATEST',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.javaClient.startApplication.title', {
      defaultMessage: 'Start your application with the javaagent flag',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.javaClient.startApplication.textPre', {
      defaultMessage:
        'Add the `-javaagent` flag and configure the agent with system properties.\n\n \
* Set the required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n \
* Set the custom APM Server URL (default: {customApmServerUrl})\n \
* Set the APM Server secret token\n \
* Set the service environment\n \
* Set the base package of your application',
      values: { customApmServerUrl: 'http://localhost:8200' },
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.javaClient.startApplication.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced \
usage.',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/java/current/index.html',
      },
    }),
  },
];

export const createDotNetAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.dotNetClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.dotNetClient.download.textPre', {
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
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.dotNetClient.configureApplication.title', {
      defaultMessage: 'Add the agent to the application',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.dotNetClient.configureApplication.textPre', {
      defaultMessage:
        'In case of ASP.NET Core with the `Elastic.Apm.NetCoreAll` package, call the `AddAllElasticApm` \
      extension method on the `IServiceCollection` available via the `WebApplicationBuilder` \
      within the `Program.cs` file.',
    }),
    commands: `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAllElasticApm();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.Run();`.split('\n'),
    textPost: i18n.translate('xpack.apm.tutorial.dotNetClient.configureApplication.textPost', {
      defaultMessage:
        'The agent will implicitly read config settings from the applications \
      `IConfiguration` instance (e.g. from the `appsettings.json` file).',
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.dotNetClient.configureAgent.title', {
      defaultMessage: 'Sample appsettings.json file:',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.dotNetClient.configureAgent.textPost', {
      defaultMessage:
        'You can also configure the agent through environment variables. \n \
      See [the documentation]({documentationLink}) for advanced usage, including the [Profiler Auto instrumentation]({profilerLink}) quick start.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/dotnet/current/configuration.html',
        profilerLink:
          '{config.docs.base_url}guide/en/apm/agent/dotnet/current/setup-auto-instrumentation.html#setup-auto-instrumentation',
      },
    }),
  },
];

export const createPhpAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.phpClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.phpClient.download.textPre', {
      defaultMessage:
        'Download the package corresponding to your platform from [GitHub releases]({githubReleasesLink}).',
      values: {
        githubReleasesLink: 'https://github.com/elastic/apm-agent-php/releases',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.phpClient.installPackage.title', {
      defaultMessage: 'Install the downloaded package',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.phpClient.installPackage.textPre', {
      defaultMessage: 'For example on Alpine Linux using APK package:',
    }),
    commands: ['apk add --allow-untrusted <package-file>.apk'],
    textPost: i18n.translate('xpack.apm.tutorial.phpClient.installPackage.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for installation commands on other supported platforms and advanced installation.',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/php/current/setup.html',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.phpClient.configureAgent.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.phpClient.configureAgent.textPre', {
      defaultMessage:
        'APM is automatically started when your app boots. Configure the agent either via `php.ini` file:',
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.phpClient.configure.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/php/current/configuration.html',
      },
    }),
  },
];

export const createOpenTelemetryAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('xpack.apm.tutorial.otel.download.title', {
      defaultMessage: 'Download the OpenTelemetry APM Agent or SDK',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.otel.download.textPre', {
      defaultMessage:
        'See the [OpenTelemetry Instrumentation guides]({openTelemetryInstrumentationLink}) to download the OpenTelemetry Agent or SDK for your language.',
      values: {
        openTelemetryInstrumentationLink: 'https://opentelemetry.io/docs/instrumentation',
      },
    }),
  },
  {
    title: i18n.translate('xpack.apm.tutorial.otel.configureAgent.title', {
      defaultMessage: 'Configure OpenTelemetry in your application',
    }),
    textPre: i18n.translate('xpack.apm.tutorial.otel.configureAgent.textPre', {
      defaultMessage:
        'Specify the following OpenTelemetry settings as part of the startup of your application. Note that OpenTelemetry SDKs require some bootstrap code in addition to these configuration settings. For more details, see the [Elastic OpenTelemetry documentation]({openTelemetryDocumentationLink}) and the [OpenTelemetry community instrumentation guides]({openTelemetryInstrumentationLink}).',
      values: {
        openTelemetryDocumentationLink:
          '{config.docs.base_url}guide/en/apm/guide/current/open-telemetry.html',
        openTelemetryInstrumentationLink: 'https://opentelemetry.io/docs/instrumentation',
      },
    }),
    customComponentName: 'TutorialConfigAgent',
    textPost: i18n.translate('xpack.apm.tutorial.otel.configure.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/guide/current/open-telemetry.html',
      },
    }),
  },
];
