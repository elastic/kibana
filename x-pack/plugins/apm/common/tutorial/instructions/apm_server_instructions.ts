/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const createEditConfig = () => ({
  title: i18n.translate('xpack.apm.tutorial.editConfig.title', {
    defaultMessage: 'Edit the configuration',
  }),
  textPre: i18n.translate('xpack.apm.tutorial.editConfig.textPre', {
    defaultMessage:
      "If you're using an X-Pack secured version of Elastic Stack, you must specify \
credentials in the `apm-server.yml` config file.",
  }),
  commands: [
    'output.elasticsearch:',
    '    hosts: ["<es_url>"]',
    '    username: <username>',
    '    password: <password>',
  ],
});

const createStartServer = () => ({
  title: i18n.translate('xpack.apm.tutorial.startServer.title', {
    defaultMessage: 'Start APM Server',
  }),
  textPre: i18n.translate('xpack.apm.tutorial.startServer.textPre', {
    defaultMessage:
      'The server processes and stores application performance metrics in Elasticsearch.',
  }),
});

export function createStartServerUnixSysv() {
  const START_SERVER = createStartServer();

  return {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['service apm-server start'],
  };
}

export function createStartServerUnix() {
  const START_SERVER = createStartServer();

  return {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['./apm-server -e'],
  };
}

export function createStartServerUnixBinari() {
  const START_SERVER = createStartServer();

  return {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['./apm-server'],
  };
}

const createDownloadServerTitle = () =>
  i18n.translate('xpack.apm.tutorial.downloadServer.title', {
    defaultMessage: 'Download and unpack APM Server',
  });

export const createDownloadServerOsx = () => ({
  title: createDownloadServerTitle(),
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-darwin-x86_64.tar.gz',
    'tar xzvf apm-server-{config.kibana.version}-darwin-x86_64.tar.gz',
    'cd apm-server-{config.kibana.version}-darwin-x86_64/',
  ],
});

export const createDownloadServerDeb = () => ({
  title: createDownloadServerTitle(),
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-amd64.deb',
    'sudo dpkg -i apm-server-{config.kibana.version}-amd64.deb',
  ],
  textPost: i18n.translate('xpack.apm.tutorial.downloadServerTitle', {
    defaultMessage:
      'Looking for the aarch64 packages? See the [Download page]({downloadPageLink}).',
    values: {
      downloadPageLink: '{config.docs.base_url}downloads/apm/apm-server',
    },
  }),
});

export const createDownloadServerRpm = () => ({
  title: createDownloadServerTitle(),
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-x86_64.rpm',
    'sudo rpm -vi apm-server-{config.kibana.version}-x86_64.rpm',
  ],
  textPost: i18n.translate('xpack.apm.tutorial.downloadServerRpm', {
    defaultMessage:
      'Looking for the aarch64 packages? See the [Download page]({downloadPageLink}).',
    values: {
      downloadPageLink: '{config.docs.base_url}downloads/apm/apm-server',
    },
  }),
});

export const createDownloadServerOtherLinux = () => ({
  title: createDownloadServerTitle(),
  commands: [
    'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-{config.kibana.version}-linux-x86_64.tar.gz',
    'tar xzvf apm-server-{config.kibana.version}-darwin-x86_64.tar.gz',
  ],
});

export function createWindowsServerInstructions() {
  const START_SERVER = createStartServer();

  return [
    {
      title: createDownloadServerTitle(),
      textPre: i18n.translate(
        'xpack.apm.tutorial.windowsServerInstructions.textPre',
        {
          defaultMessage:
            '1. Download the APM Server Windows zip file from the \
[Download page]({downloadPageLink}).\n2. Extract the contents of \
the zip file into {zipFileExtractFolder}.\n3. Rename the {apmServerDirectory} \
directory to `APM-Server`.\n4. Open a PowerShell prompt as an Administrator \
(right-click the PowerShell icon and select \
**Run As Administrator**). If you are running Windows XP, you might need to download and install \
PowerShell.\n5. From the PowerShell prompt, run the following commands to install APM Server as a Windows service:',
          values: {
            downloadPageLink: 'https://www.elastic.co/downloads/apm/apm-server',
            zipFileExtractFolder: '`C:\\Program Files`',
            apmServerDirectory: '`apm-server-{config.kibana.version}-windows`',
          },
        }
      ),
      commands: [
        `cd 'C:\\Program Files\\APM-Server'`,
        `.\\install-service-apm-server.ps1`,
      ],
      textPost: i18n.translate(
        'xpack.apm.tutorial.windowsServerInstructions.textPost',
        {
          defaultMessage:
            'Note: If script execution is disabled on your system, \
you need to set the execution policy for the current session \
to allow the script to run. For example: {command}.',
          values: {
            command:
              '`PowerShell.exe -ExecutionPolicy UnRestricted -File .\\install-service-apm-server.ps1`',
          },
        }
      ),
    },
    createEditConfig(),
    {
      title: START_SERVER.title,
      textPre: START_SERVER.textPre,
      commands: ['Start-Service apm-server'],
    },
  ];
}
