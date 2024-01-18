/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityCreateApiKeyResponse,
  SecurityUpdateApiKeyResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ExclusiveUnion } from '@elastic/eui';

import type { ApiKey, RestApiKey } from '../../../../common';

/**
 * The component types are in a separate file so we don't drag in the whole plugin in the bundle
 * when lazy loading
 */

export interface ApiKeyFormValues {
  name: string;
  type: string;
  expiration: string;
  customExpiration: boolean;
  customPrivileges: boolean;
  includeMetadata: boolean;
  access: string;
  role_descriptors: string;
  metadata: string;
}

interface CommonApiKeyFlyoutProps {
  initialValues?: ApiKeyFormValues;
  onCancel(): void;
  canManageCrossClusterApiKeys?: boolean;
  readOnly?: boolean;
}

interface CreateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (createApiKeyResponse: SecurityCreateApiKeyResponse) => void;
}

interface UpdateApiKeyFlyoutProps extends CommonApiKeyFlyoutProps {
  onSuccess?: (updateApiKeyResponse: SecurityUpdateApiKeyResponse) => void;
  apiKey: CategorizedApiKey;
}

/**
 * Interface representing a REST API key that is managed by Kibana.
 */
export interface ManagedApiKey extends Omit<RestApiKey, 'type'> {
  type: 'managed';
}

/**
 * Interface representing an API key the way it is presented in the Kibana UI  (with Kibana system
 * API keys given its own dedicated `managed` type).
 */
export type CategorizedApiKey = (ApiKey | ManagedApiKey) & {
  expired: boolean;
};

export type ApiKeyFlyoutProps = ExclusiveUnion<CreateApiKeyFlyoutProps, UpdateApiKeyFlyoutProps>;
