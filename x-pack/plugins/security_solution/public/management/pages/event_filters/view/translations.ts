/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { ArtifactFormComponentProps } from '../../../components/artifact_list_page';

export const getCreationSuccessMessage = (item: ArtifactFormComponentProps['item']) => {
  return i18n.translate('xpack.securitySolution.eventFilter.flyoutForm.creationSuccessToastTitle', {
    defaultMessage: '"{name}" has been added to the event filters list.',
    values: { name: item?.name },
  });
};

export const getCreationErrorMessage = (creationError: IHttpFetchError) => {
  return {
    title: 'There was an error creating the new event filter: "{error}"',
    message: { error: creationError.message },
  };
};
