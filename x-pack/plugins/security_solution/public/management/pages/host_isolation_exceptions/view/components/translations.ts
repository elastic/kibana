/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.placeholder',
  {
    defaultMessage: 'New IP',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.label',
  {
    defaultMessage: 'Name your host isolation exceptions',
  }
);

export const NAME_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.error',
  {
    defaultMessage: "The name can't be empty",
  }
);

export const DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.description.placeholder',
  {
    defaultMessage: 'Describe your Host Isolation Exception',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.description.label',
  {
    defaultMessage: 'Description',
  }
);

export const IP_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.placeholder',
  {
    defaultMessage: 'Ex 0.0.0.0/24',
  }
);

export const IP_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.label',
  {
    defaultMessage: 'Enter IP Address',
  }
);

export const IP_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.error',
  {
    defaultMessage: 'The ip is invalid. Only IPv4 with optional CIDR is supported',
  }
);

export const DELETE_HOST_ISOLATION_EXCEPTION_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.list.action.delete',
  {
    defaultMessage: 'Delete Exception',
  }
);

export const EDIT_HOST_ISOLATION_EXCEPTION_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.list.action.edit',
  {
    defaultMessage: 'Edit Exception',
  }
);
export const HOST_ISOLATION_EXCEPTION_CREATION_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.creationFailureToastTitle',
  {
    defaultMessage: 'There was an error creating the exception',
  }
);

export const HOST_ISOLATION_EXCEPTION_EDIT_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.editFailureToastTitle',
  {
    defaultMessage: 'There was an error editing the exception',
  }
);
