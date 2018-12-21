/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { IndexLifecycleSummary } from './components/index_lifecycle_summary';
import { AddLifecyclePolicyConfirmModal } from './components/add_lifecycle_confirm_modal';
import { RemoveLifecyclePolicyConfirmModal } from './components/remove_lifecycle_confirm_modal';
import { get, every, any } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  addSummaryExtension,
  addBannerExtension,
  addActionExtension,
  addFilterExtension,
} from '../../../index_management/public/index_management_extensions';
import { retryLifecycleForIndex } from '../services/api';
import { EuiSearchBar } from '@elastic/eui';

const stepPath = 'ilm.step';
export const retryLifecycleActionExtension = indices => {
  const allHaveErrors = every(indices, index => {
    return index.ilm && index.ilm.failed_step;
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
    successMessage: i18n.translate(
      'xpack.idxMgmt.retryIndexLifecycleAction.retriedLifecycleMessage',
      {
        defaultMessage: 'Called retry lifecycle step for: {indexNames}',
        values: { indexNames: indexNames.map(indexName => `"${indexName}"`).join(', ') },
      }
    ),
  };
};

export const removeLifecyclePolicyActionExtension = (indices, reloadIndices) => {
  const allHaveIlm = every(indices, index => {
    return index.ilm && index.ilm.managed;
  });
  if (!allHaveIlm) {
    return null;
  }
  const indexNames = indices.map(({ name }) => name);
  return {
    renderConfirmModal: (closeModal, httpClient) => {
      return (
        <RemoveLifecyclePolicyConfirmModal
          indexNames={indexNames}
          closeModal={closeModal}
          httpClient={httpClient}
          reloadIndices={reloadIndices}
        />
      );
    },
    icon: 'stopFilled',
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.idxMgmt.removeIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Remove lifecycle policy',
    }),
  };
};

export const addLifecyclePolicyActionExtension = (indices, reloadIndices) => {
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
          reloadIndices={reloadIndices}
        />
      );
    },
    icon: 'plusInCircle',
    buttonLabel: i18n.translate('xpack.idxMgmt.addLifecyclePolicyActionButtonLabel', {
      defaultMessage: 'Add lifecycle policy',
    }),
  };
};

addActionExtension(retryLifecycleActionExtension);
addActionExtension(removeLifecyclePolicyActionExtension);
addActionExtension(addLifecyclePolicyActionExtension);

export const ilmBannerExtension = indices => {
  const { Query } = EuiSearchBar;
  if (!indices.length) {
    return null;
  }
  const indicesWithLifecycleErrors = indices.filter(index => {
    return get(index, stepPath) === 'ERROR';
  });
  const numIndicesWithLifecycleErrors = indicesWithLifecycleErrors.length;
  if (!numIndicesWithLifecycleErrors) {
    return null;
  }
  return {
    type: 'warning',
    filter: Query.parse(`${stepPath}:ERROR`),
    filterLabel: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.filterLabel', {
      defaultMessage: 'Show errors',
    }),
    title: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.errorMessage', {
      defaultMessage: `{ numIndicesWithLifecycleErrors, number}
          {numIndicesWithLifecycleErrors, plural, one {index has} other {indices have} }
          lifecycle errors`,
      values: { numIndicesWithLifecycleErrors },
    }),
  };
};

addBannerExtension(ilmBannerExtension);

export const ilmSummaryExtension = index => {
  return <IndexLifecycleSummary index={index} />;
};

addSummaryExtension(ilmSummaryExtension);

export const ilmFilterExtension = indices => {
  const hasIlm = any(indices, index => index.ilm && index.ilm.managed);
  if (!hasIlm) {
    return [];
  } else {
    return [
      {
        type: 'field_value_selection',
        name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.lifecycleStatusLabel', {
          defaultMessage: 'Lifecycle status',
        }),
        multiSelect: false,
        field: 'ilm.managed',
        options: [
          {
            value: true,
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.managedLabel', {
              defaultMessage: 'Managed',
            }),
          },
          {
            value: false,
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.unmanagedLabel', {
              defaultMessage: 'Unmanaged',
            }),
          },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'ilm.phase',
        name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.lifecyclePhaseLabel', {
          defaultMessage: 'Lifecycle phase',
        }),
        multiSelect: 'or',
        options: [
          {
            value: 'hot',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.hotLabel', {
              defaultMessage: 'Hot',
            }),
          },
          {
            value: 'warm',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.warmLabel', {
              defaultMessage: 'Warm',
            }),
          },
          {
            value: 'cold',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.coldLabel', {
              defaultMessage: 'Cold',
            }),
          },
          {
            value: 'delete',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.deleteLabel', {
              defaultMessage: 'Delete',
            }),
          },
        ],
      },
    ];
  }
};

addFilterExtension(ilmFilterExtension);
