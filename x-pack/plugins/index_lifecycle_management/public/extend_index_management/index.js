/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { IndexLifecycleSummary } from './components/index_lifecycle_summary';
import { AddLifecyclePolicyConfirmModal } from './components/add_lifecycle_confirm_modal';
import { get, every } from 'lodash';
import { i18n }  from '@kbn/i18n';
import { addSummaryExtension, addBannerExtension, addActionExtension } from '../../../index_management/public/index_management_extensions';
import { retryLifecycleForIndex, removeLifecycleForIndex } from '../services/api';

const stepPath = 'ilm.step';


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
    icon: 'play',
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.idxMgmt.retryIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Retry lifecycle step',
    }),
    successMessage: i18n.translate('xpack.idxMgmt.retryIndexLifecycleAction.successfullyRetriedLifecycleMessage', {
      defaultMessage: 'Successfully called retry lifecycle step for: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') }
    }),
  };
});
addActionExtension((indices) => {
  const allHaveIlm = every(indices, (index) => {
    return index.ilm && index.ilm.managed;
  });
  if (!allHaveIlm) {
    return null;
  }
  const indexNames = indices.map(({ name }) => name);
  return {
    requestMethod: removeLifecycleForIndex,
    icon: 'stopFilled',
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.idxMgmt.removeIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Remove lifecycle policy',
    }),
    successMessage: i18n.translate('xpack.idxMgmt.retryIndexLifecycleAction.successfullyRemovedLifecycleMessage', {
      defaultMessage: 'Successfully removed lifecycle policy for: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') }
    }),
  };
});
addActionExtension((indices) => {
  if (indices.length !== 1) {
    return null;
  }
  const index = indices[0];
  const hasIlm = index.ilm && index.ilm.managed;

  if (hasIlm) {
    return null;
  }
  const indexName = index.name;
  return {
    renderConfirmModal: (closeModal, httpClient) => {
      return (
        <AddLifecyclePolicyConfirmModal
          indexName={indexName}
          closeModal={closeModal}
          httpClient={httpClient}
          index={index}
        />
      );
    },
    icon: 'plusInCircle',
    buttonLabel: i18n.translate('xpack.idxMgmt.addLifecyclePolicyActionButtonLabel', {
      defaultMessage: 'Add lifecycle policy',
    }),
  };
});
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
    filterLabel: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.filterLabel', {
      defaultMessage: 'Show errors',
    }),
    title: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.errorMessage', {
      defaultMessage: `{ numIndicesWithLifecycleErrors, number}
          {numIndicesWithLifecycleErrors, plural, one {index has} other {indices have} }
          lifecycle errors`,
      values: { numIndicesWithLifecycleErrors }
    }),
  };
});
addSummaryExtension((index) => {
  return <IndexLifecycleSummary index={index} />;
});


