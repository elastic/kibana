/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { every } from 'lodash';
import { i18n }  from '@kbn/i18n';
import { addActionExtension } from '../../../index_management/public/index_management_extensions';
import { retryLifecycleForIndex } from '../api';
addActionExtension((indices) => {
  const allHaveErrors = every(indices, (index) => {
    return (index.ilm && index.ilm.failed_step);
  });
  if (!allHaveErrors) {
    return null;
  }
  const indexNames = indices.map(({ name }) => name);
  return {
    requestMethod: retryLifecycleForIndex,
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.idxMgmt.retryIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Retry lifecycle',
    }),
    successMessage: i18n.translate('xpack.idxMgmt.retryIndexLifecycleAction.successfullyRetriedLifecycleMessage', {
      defaultMessage: 'Successfully called retry lifecycle for: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') }
    }),
  };
});

