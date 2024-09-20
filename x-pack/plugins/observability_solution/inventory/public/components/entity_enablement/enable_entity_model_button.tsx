/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EntityManagerUnauthorizedError } from '@kbn/entityManager-plugin/public';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useKibana } from '../../hooks/use_kibana';
import { Unauthorized } from './unauthorized_modal';

export function EnableEntityModelButton({ onSuccess }: { onSuccess: () => void }) {
  const {
    dependencies: {
      start: { entityManager },
    },
    core: { notifications },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setModalVisible] = useState(false);

  const handleEnablement = async () => {
    setIsLoading(true);
    try {
      const response = await entityManager.entityClient.enableManagedEntityDiscovery();

      if (response.success) {
        setIsLoading(false);
        onSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setIsLoading(false);

      if (error instanceof EntityManagerUnauthorizedError) {
        setModalVisible(true);
        return;
      }

      const err = error as Error | IHttpFetchError<ResponseErrorBody>;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.inventory.eemEnablement.errorTitle', {
          defaultMessage: 'Error while enabling the new entity model',
        }),
        text: 'response' in err ? err.body?.message ?? err.response?.statusText : err.message,
      });
    }
  };

  return (
    <>
      <EuiButton
        isLoading={isLoading}
        data-test-subj="inventoryInventoryPageTemplateFilledButton"
        fill
        onClick={handleEnablement}
      >
        {i18n.translate('xpack.inventory.noData.card.button', {
          defaultMessage: 'Enable',
        })}
      </EuiButton>
      <Unauthorized showModal={showModal} onClose={() => setModalVisible(false)} />
    </>
  );
}
