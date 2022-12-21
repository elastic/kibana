/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Note for translators and programmers
// Examples of these strings are all of the form
// Session {user.name}@{hostname} in {folder} was authorized to use {executable} with result {result.success/failure}
// E.x. Frank@server-1 in /root was authorized to use wget with result success

// However, the strings can be dropped depending on the circumstances of the variables. For example, with no data at all
// Example with just a user name and hostname
// Session 20 frank@server-1
// Example with user name, hostname, but no result
// Session 20 frank@server-1 started process curl

export const WITH_RESULT = i18n.translate('xpack.securitySolution.system.withResultDescription', {
  defaultMessage: 'with result',
});

export const ACCEPTED_A_CONNECTION_VIA = i18n.translate(
  'xpack.securitySolution.system.acceptedAConnectionViaDescription',
  {
    defaultMessage: 'accepted a connection via',
  }
);

export const ATTEMPTED_LOGIN = i18n.translate(
  'xpack.securitySolution.system.attemptedLoginDescription',
  {
    defaultMessage: 'attempted a login via',
  }
);

export const DISCONNECTED_VIA = i18n.translate(
  'xpack.securitySolution.system.disconnectedViaDescription',
  {
    defaultMessage: 'disconnected via',
  }
);

export const LOGGED_OUT = i18n.translate('xpack.securitySolution.system.loggedOutDescription', {
  defaultMessage: 'logged out via',
});

export const USING = i18n.translate('xpack.securitySolution.system.usingDescription', {
  defaultMessage: 'using',
});

export const PROCESS_STARTED = i18n.translate(
  'xpack.securitySolution.system.processStartedDescription',
  {
    defaultMessage: 'started process',
  }
);

export const PROCESS_STOPPED = i18n.translate(
  'xpack.securitySolution.system.processStoppedDescription',
  {
    defaultMessage: 'stopped process',
  }
);

export const TERMINATED_PROCESS = i18n.translate(
  'xpack.securitySolution.system.terminatedProcessDescription',
  {
    defaultMessage: 'terminated process',
  }
);

export const CREATED_FILE = i18n.translate('xpack.securitySolution.system.createdFileDescription', {
  defaultMessage: 'created a file',
});

export const DELETED_FILE = i18n.translate('xpack.securitySolution.system.deletedFileDescription', {
  defaultMessage: 'deleted a file',
});

export const EXECUTED_PROCESS = i18n.translate(
  'xpack.securitySolution.rowRenderer.executedProcessDescription',
  {
    defaultMessage: 'executed process',
  }
);

export const FORKED_PROCESS = i18n.translate(
  'xpack.securitySolution.rowRenderer.forkedProcessDescription',
  {
    defaultMessage: 'forked process',
  }
);

export const LOADED_LIBRARY = i18n.translate(
  'xpack.securitySolution.rowRenderer.loadedLibraryDescription',
  {
    defaultMessage: 'loaded library',
  }
);

export const MADE_A_HTTP_REQUEST_VIA = i18n.translate(
  'xpack.securitySolution.rowRenderer.madeAHttpRequestViaDescription',
  {
    defaultMessage: 'made a http request via',
  }
);

export const MODIFIED_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.modifiedFileDescription',
  {
    defaultMessage: 'modified a file',
  }
);

export const MODIFIED_REGISTRY_KEY = i18n.translate(
  'xpack.securitySolution.rowRenderer.modifiedRegistryKeyDescription',
  {
    defaultMessage: 'modified registry key',
  }
);

export const OVERWROTE_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.overwroteFileDescription',
  {
    defaultMessage: 'overwrote a file',
  }
);

export const RENAMED_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.renamedFileDescription',
  {
    defaultMessage: 'renamed a file',
  }
);

export const EXISTING_PROCESS = i18n.translate(
  'xpack.securitySolution.system.existingProcessDescription',
  {
    defaultMessage: 'is running process',
  }
);

export const SOCKET_OPENED = i18n.translate(
  'xpack.securitySolution.system.socketOpenedDescription',
  {
    defaultMessage: 'opened a socket with',
  }
);

export const SOCKET_CLOSED = i18n.translate(
  'xpack.securitySolution.system.socketClosedDescription',
  {
    defaultMessage: 'closed a socket with',
  }
);

export const EXISTING_USER = i18n.translate(
  'xpack.securitySolution.system.existingUserDescription',
  {
    defaultMessage: 'is an existing user',
  }
);

export const EXISTING_SOCKET = i18n.translate(
  'xpack.securitySolution.system.existingSocketDescription',
  {
    defaultMessage: 'is using an existing socket from',
  }
);

export const EXISTING_PACKAGE = i18n.translate(
  'xpack.securitySolution.system.existingPackageDescription',
  {
    defaultMessage: 'is using an existing package',
  }
);

export const INVALID = i18n.translate('xpack.securitySolution.system.invalidDescription', {
  defaultMessage: 'attempted invalid usage of',
});

export const USER_CHANGED = i18n.translate('xpack.securitySolution.system.userChangedDescription', {
  defaultMessage: 'user has changed',
});

export const HOST_CHANGED = i18n.translate('xpack.securitySolution.system.hostDescription', {
  defaultMessage: 'host information',
});

export const USER_ADDED = i18n.translate('xpack.securitySolution.system.userAddedDescription', {
  defaultMessage: 'user was added',
});

export const PROCESS_ERROR = i18n.translate(
  'xpack.securitySolution.system.processErrorDescription',
  {
    defaultMessage: 'encountered a process error with',
  }
);

export const ERROR = i18n.translate('xpack.securitySolution.system.errorDescription', {
  defaultMessage: 'encountered an error with',
});

export const PACKAGE_INSTALLED = i18n.translate(
  'xpack.securitySolution.system.packageInstalledDescription',
  {
    defaultMessage: 'installed package',
  }
);

export const BOOT = i18n.translate(
  'xpack.securitySolution.system.packageSystemStartedDescription',
  {
    defaultMessage: 'system started',
  }
);

export const ACCEPTED = i18n.translate('xpack.securitySolution.system.acceptedDescription', {
  defaultMessage: 'accepted the user via',
});

export const PACKAGE_UPDATED = i18n.translate(
  'xpack.securitySolution.system.packageUpdatedDescription',
  {
    defaultMessage: 'updated package',
  }
);

export const PACKAGE_REMOVED = i18n.translate(
  'xpack.securitySolution.system.packageRemovedDescription',
  {
    defaultMessage: 'removed package',
  }
);

export const USER_REMOVED = i18n.translate('xpack.securitySolution.system.userRemovedDescription', {
  defaultMessage: 'was removed',
});

export const VIA = i18n.translate('xpack.securitySolution.system.viaDescription', {
  defaultMessage: 'via',
});

export const VIA_PARENT_PROCESS = i18n.translate(
  'xpack.securitySolution.system.viaParentProcessDescription',
  {
    defaultMessage: 'via parent process',
  }
);

export const RANSOMWARE_WAS_PREVENTED_FROM_ENCRYPTING_FILES = i18n.translate(
  'xpack.securitySolution.rowRenderer.ransomwareWasPreventedFromeEcryptingFilesDescription',
  {
    defaultMessage: 'ransomware was prevented from encrypting files',
  }
);

export const RANSOMWARE_WAS_DETECTED_ENCRYPTING_FILES = i18n.translate(
  'xpack.securitySolution.rowRenderer.ransomwareWasDetectedEcryptingFilesDescription',
  {
    defaultMessage: 'ransomware was detected encrypting files',
  }
);

export const WAS_DETECTED_CREATING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasDetectedCreatingAMaliciousFileDescription',
  {
    defaultMessage: 'was detected creating a malicious file',
  }
);

export const WAS_PREVENTED_FROM_CREATING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasPreventedFromCreatingAMaliciousFileDescription',
  {
    defaultMessage: 'was prevented from creating a malicious file',
  }
);

export const WAS_DETECTED_MODIFYING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasDetectedModifyingAMaliciousFileDescription',
  {
    defaultMessage: 'was detected modifying a malicious file',
  }
);

export const WAS_PREVENTED_FROM_MODIFYING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasPreventedFromModifyingAMaliciousFileDescription',
  {
    defaultMessage: 'was prevented from modifying a malicious file',
  }
);

export const WAS_DETECTED_RENAMING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasDetectedRenamingAMaliciousFileDescription',
  {
    defaultMessage: 'was detected renaming a malicious file',
  }
);

export const WAS_PREVENTED_FROM_RENAMING_A_MALICIOUS_FILE = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasPreventedFromRenamingAMaliciousFileDescription',
  {
    defaultMessage: 'was prevented from renaming a malicious file',
  }
);

export const WAS_DETECTED_EXECUTING_A_MALICIOUS_PROCESS = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasDetectedExecutingAMaliciousProcessDescription',
  {
    defaultMessage: 'was detected executing a malicious process',
  }
);

export const WAS_PREVENTED_FROM_EXECUTING_A_MALICIOUS_PROCESS = i18n.translate(
  'xpack.securitySolution.rowRenderer.wasPreventedFromExecutingAMaliciousProcessDescription',
  {
    defaultMessage: 'was prevented from executing a malicious process',
  }
);

export const WITH_EXIT_CODE = i18n.translate(
  'xpack.securitySolution.system.withExitCodeDescription',
  {
    defaultMessage: 'with exit code',
  }
);
