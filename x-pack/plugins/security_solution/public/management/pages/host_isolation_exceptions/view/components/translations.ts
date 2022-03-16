/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ServerApiError } from '../../../../../common/types';

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.placeholder',
  {
    defaultMessage: 'Host isolation exception name',
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
    defaultMessage: 'Describe your host isolation exception',
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
    defaultMessage: 'The IP is invalid. Only IPv4 with optional CIDR is supported',
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

export const getCreateErrorMessage = (creationError: ServerApiError) => {
  return i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.form.failedToastTitle.create',
    {
      defaultMessage: 'There was an error creating the exception: "{error}"',
      values: { error: creationError.message },
    }
  );
};

export const getUpdateErrorMessage = (updateError: ServerApiError) => {
  return i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.form.failedToastTitle.update',
    {
      defaultMessage: 'There was an error updating the exception: "{error}"',
      values: { error: updateError.message },
    }
  );
};

export const getLoadErrorMessage = (getError: ServerApiError) => {
  return i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.form.failedToastTitle.get',
    {
      defaultMessage: 'Unable to edit exception: "{error}"',
      values: { error: getError.message },
    }
  );
};

export const getUpdateSuccessMessage = (name: string) => {
  return i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.form.editingSuccessToastTitle',
    {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }
  );
};

export const getCreationSuccessMessage = (name: string) => {
  return i18n.translate(
    'xpack.securitySolution.hostIsolationExceptions.form.creationSuccessToastTitle',
    {
      defaultMessage: '"{name}" has been added to the host isolation exceptions list.',
      values: { name },
    }
  );
};
