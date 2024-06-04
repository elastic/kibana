/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoveryCreateProps,
  AttackDiscoveryUpdateProps,
  AttackDiscoveryResponse,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { updateAttackDiscovery } from './update_attack_discovery';
import { createAttackDiscovery } from './create_attack_discovery';
import { getAttackDiscovery } from './get_attack_discovery';
import { AIAssistantDataClient, AIAssistantDataClientParams } from '..';

type AttackDiscoveryDataClientParams = AIAssistantDataClientParams;

export class AttackDiscoveryDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AttackDiscoveryDataClientParams) {
    super(options);
  }

  /**
   * Fetches an attack discovery
   * @param options
   * @param options.id The existing attack discovery id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The attack discovery response
   */
  public getAttackDiscovery = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Creates an attack discovery, if given at least the "apiConfig"
   * See {@link https://www.elastic.co/guide/en/security/current/}
   * for more information around formats of the deserializer and serializer
   * @param options
   * @param options.attackDiscoveries
   * @param options.authenticatedUser
   * @returns The Attack Discovery created
   */
  public createAttackDiscovery = async ({
    attackDiscoveries,
    authenticatedUser,
  }: {
    attackDiscoveries: AttackDiscoveryCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return createAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      spaceId: this.spaceId,
      user: authenticatedUser,
      attackDiscoveries,
    });
  };

  public updateAttackDiscovery = async ({
    attackDiscoveryUpdateProps,
    authenticatedUser,
    isPatch,
  }: {
    attackDiscoveryUpdateProps: AttackDiscoveryUpdateProps;
    authenticatedUser: AuthenticatedUser;
    isPatch?: boolean;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      attackDiscoveryUpdateProps,
      isPatch,
      user: authenticatedUser,
    });
  };
}
