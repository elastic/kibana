/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import { Integration } from '../../../common/integrations';
import { useWorkChatServices } from './use_workchat_service';

export interface IntegrationEditState {
  name: string;
  description: string;
  type: string;
  configuration: Record<string, any>;
}

const emptyState = (): IntegrationEditState => {
  return {
    name: '',
    description: '',
    type: '',
    configuration: {},
  };
};
export const useIntegrationEdit = ({
  integrationId,
  onSaveSuccess,
  onSaveError,
}: {
  integrationId: string | undefined;
  onSaveSuccess: (integration: Integration) => void;
  onSaveError: (err: Error) => void;
}) => {
  const { integrationService } = useWorkChatServices();
  const [state, setState] = useState<IntegrationEditState>(emptyState());
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (integrationId) {
        const integration = await integrationService.get(integrationId);
        setState({
          name: integration.name,
          description: integration.description,
          type: integration.type,
          configuration: integration.configuration || {},
        });
      }
    };
    fetchIntegration();
  }, [integrationId, integrationService]);

  const submit = useCallback(
    (updatedIntegration: IntegrationEditState) => {
      setSubmitting(true);

      (integrationId
        ? integrationService.update(integrationId, {
            name: updatedIntegration.name,
            description: updatedIntegration.description,
            configuration: updatedIntegration.configuration,
          })
        : integrationService.create({
            type: updatedIntegration.type,
            name: updatedIntegration.name,
            description: updatedIntegration.description,
            configuration: updatedIntegration.configuration,
          })
      ).then(
        (response) => {
          setSubmitting(false);
          onSaveSuccess(response);
        },
        (err) => {
          setSubmitting(false);
          onSaveError(err);
        }
      );
    },
    [integrationId, integrationService, onSaveSuccess, onSaveError]
  );

  return {
    state,
    isSubmitting,
    submit,
  };
};
