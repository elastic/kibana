/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddAnalyticsCollectionModal } from './add_analytics_collection_modal';

export const AddAnalyticsCollection: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  return (
    <>
      <EuiButton fill iconType="plusInCircle" onClick={showModal}>
        {i18n.translate('xpack.enterpriseSearch.analytics.collections.create.buttonTitle', {
          defaultMessage: 'Create collection',
        })}
      </EuiButton>
      {isModalVisible && <AddAnalyticsCollectionModal onClose={closeModal} />}
    </>
  );
};
