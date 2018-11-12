/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { addBannerExtension } from '../../../index_management/public/index_management_extensions';
const stepPath = 'ilm.step';
import { i18n } from '@kbn/i18n';

addBannerExtension((indices) =>{
  if (!indices.length) {
    return null;
  }
  const indicesWithLifecycleErrors = indices.filter((index) => {
    return get(index, stepPath) === 'ERROR';
  });
  const numIndicesWithLifecycleErrors = indicesWithLifecycleErrors.length;
  if (!numIndicesWithLifecycleErrors) {
    return null;
  }
  return {
    type: 'warning',
    filter: `${stepPath}:ERROR`,
    message: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.errorMessage', {
      defaultMessage: `{ numIndicesWithLifecycleErrors, number} 
        {numIndicesWithLifecycleErrors, plural, one {index has} other {indices have} } 
        lifecycle errors`,
      values: { numIndicesWithLifecycleErrors }
    }),
  };
});