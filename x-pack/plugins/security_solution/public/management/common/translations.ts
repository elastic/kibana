/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { ServerApiError } from '../../common/types';

export const ENDPOINTS_TAB = i18n.translate('xpack.securitySolution.endpointsTab', {
  defaultMessage: 'Endpoints',
});

export const POLICIES_TAB = i18n.translate('xpack.securitySolution.policiesTab', {
  defaultMessage: 'Policies',
});

export const TRUSTED_APPS_TAB = i18n.translate('xpack.securitySolution.trustedAppsTab', {
  defaultMessage: 'Trusted applications',
});

export const EVENT_FILTERS_TAB = i18n.translate('xpack.securitySolution.eventFiltersTab', {
  defaultMessage: 'Event filters',
});

export const OS_TITLES: Readonly<{ [K in OperatingSystem]: string }> = {
  [OperatingSystem.WINDOWS]: i18n.translate('xpack.securitySolution.administration.os.windows', {
    defaultMessage: 'Windows',
  }),
  [OperatingSystem.MAC]: i18n.translate('xpack.securitySolution.administration.os.macos', {
    defaultMessage: 'Mac',
  }),
  [OperatingSystem.LINUX]: i18n.translate('xpack.securitySolution.administration.os.linux', {
    defaultMessage: 'Linux',
  }),
};

export const getLoadPoliciesError = (error: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.exceptions.failedLoadPolicies', {
    defaultMessage: 'There was an error loading policies: "{error}"',
    values: { error: error.message },
  });
};

export const CONSOLE_COMMANDS = {
  isolate: {
    title: i18n.translate('xpack.securitySolution.endpointConsoleCommands.isolate.title', {
      defaultMessage: 'Isolate',
    }),
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.isolate.about', {
      defaultMessage: 'Isolate the host',
    }),
    privileges: i18n.translate(
      'xpack.securitySolution.endpointConsoleCommands.isolate.privileges',
      {
        defaultMessage:
          'Insufficient privileges to isolate hosts. Contact your Kibana administrator if you think you should have this permission.',
      }
    ),
  },
  release: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.release.about', {
      defaultMessage: 'Release the host',
    }),
  },
  killProcess: {
    title: i18n.translate('xpack.securitySolution.endpointConsoleCommands.killProcess.title', {
      defaultMessage: 'Kill process',
    }),
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.killProcess.about', {
      defaultMessage: 'Kill/terminate a process',
    }),
    privileges: i18n.translate(
      'xpack.securitySolution.endpointConsoleCommands.killProcess.privileges',
      {
        defaultMessage:
          'Insufficient privileges to kill process. Contact your Kibana administrator if you think you should have this permission.',
      }
    ),
    args: {
      pid: {
        about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.pid.arg.comment', {
          defaultMessage: 'A PID representing the process to kill',
        }),
      },
      entityId: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.entityId.arg.comment',
          {
            defaultMessage: 'An entity id representing the process to kill',
          }
        ),
      },
      processName: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.processName.arg.comment',
          { defaultMessage: 'The process name to kill' }
        ),
      },
    },
  },
  suspendProcess: {
    title: i18n.translate('xpack.securitySolution.endpointConsoleCommands.suspendProcess.title', {
      defaultMessage: 'Suspend process',
    }),
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.suspendProcess.about', {
      defaultMessage: 'Temporarily suspend a process',
    }),
    privileges: i18n.translate(
      'xpack.securitySolution.endpointConsoleCommands.suspendProcess.privileges',
      {
        defaultMessage:
          'Insufficient privileges to supend process. Contact your Kibana administrator if you think you should have this permission.',
      }
    ),
    args: {
      pid: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.suspendProcess.pid.arg.comment',
          {
            defaultMessage: 'A PID representing the process to suspend',
          }
        ),
      },
      entityId: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.suspendProcess.entityId.arg.comment',
          {
            defaultMessage: 'An entity id representing the process to suspend',
          }
        ),
      },
    },
  },
  status: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.status.about', {
      defaultMessage: 'Show host status information',
    }),
  },
  processes: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.processes.about', {
      defaultMessage: 'Show all running processes',
    }),
  },
  getFile: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.getFile.about', {
      defaultMessage: 'Retrieve a file from the host',
    }),
    args: {
      path: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.getFile.pathArgAbout',
          {
            defaultMessage: 'The full file path to be retrieved',
          }
        ),
      },
    },
  },
  execute: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.execute.about', {
      defaultMessage: 'Execute a command on the host',
    }),
    args: {
      timeout: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.execute.args.timeout.about',
          {
            defaultMessage:
              'The timeout in units of time (h for hours, m for minutes, s for seconds) for the endpoint to wait for the script to complete. Example: 37m. If not given, it defaults to 4 hours.',
          }
        ),
      },
    },
  },
  upload: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.upload.about', {
      defaultMessage: 'Upload a file to the host',
    }),
    args: {
      file: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.upload.args.file.about',
          {
            defaultMessage: 'The file that will be sent to the host',
          }
        ),
      },
      overwrite: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.upload.args.overwrite.about',
          {
            defaultMessage: 'Overwrite the file on the host if it already exists',
          }
        ),
      },
    },
  },
  scan: {
    about: i18n.translate('xpack.securitySolution.endpointConsoleCommands.scan.about', {
      defaultMessage: 'Scan the host for malware',
    }),
    args: {
      path: {
        about: i18n.translate(
          'xpack.securitySolution.endpointConsoleCommands.scan.args.path.about',
          {
            defaultMessage: 'The absolute path to a file or directory to be scanned',
          }
        ),
      },
    },
  },
};

export const CROWDSTRIKE_CONSOLE_COMMANDS = {
  runscript: {
    args: {
      raw: {
        about: i18n.translate(
          'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.args.raw.about',
          {
            defaultMessage: 'Raw script content',
          }
        ),
      },
      cloudFile: {
        about: i18n.translate(
          'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.args.cloudFile.about',
          {
            defaultMessage: 'Script name in cloud storage',
          }
        ),
      },
      commandLine: {
        about: i18n.translate(
          'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.args.commandLine.about',
          {
            defaultMessage: 'Command line arguments',
          }
        ),
      },
      hostPath: {
        about: i18n.translate(
          'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.args.hostPath.about',
          {
            defaultMessage: 'Absolute or relative path of script on host machine',
          }
        ),
      },
      timeout: {
        about: i18n.translate(
          'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.args.timeout.about',
          {
            defaultMessage: 'Timeout in seconds',
          }
        ),
      },
    },
    title: i18n.translate('xpack.securitySolution.crowdStrikeConsoleCommands.runscript.title', {
      defaultMessage: 'Isolate',
    }),
    about: i18n.translate('xpack.securitySolution.crowdStrikeConsoleCommands.runscript.about', {
      defaultMessage: 'Run a script on the host',
    }),
    privileges: i18n.translate(
      'xpack.securitySolution.crowdStrikeConsoleCommands.runscript.privileges',
      {
        defaultMessage:
          'Insufficient privileges to run script. Contact your Kibana administrator if you think you should have this permission.',
      }
    ),
  },
};

export const CONFIRM_WARNING_MODAL_LABELS = (entryType: string) => {
  return {
    title: i18n.translate('xpack.securitySolution.artifacts.confirmWarningModal.title', {
      defaultMessage: `Confirm {type}`,
      values: { type: entryType },
    }),
    body: i18n.translate('xpack.securitySolution.artifacts.confirmWarningModal.body', {
      defaultMessage:
        'Using a "*" or a "?" in the value with the "is" operator can make the entry ineffective. Change the operator to "matches" to ensure wildcards run properly. Select “Cancel” to revise your entry, or "Add" to continue with the entry in its current state.',
    }),
    confirmButton: i18n.translate(
      'xpack.securitySolution.artifacts.confirmWarningModal.confirmButtonText',
      {
        defaultMessage: 'Add',
      }
    ),
    cancelButton: i18n.translate(
      'xpack.securitySolution.trustedapps.confirmWarningModal.cancelButtonText',
      {
        defaultMessage: 'Cancel',
      }
    ),
  };
};
