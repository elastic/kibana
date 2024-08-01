/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  DefendInsightCreateProps,
  DefendInsightUpdateProps,
  DefendInsightsResponse,
} from '@kbn/elastic-assistant-common';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import type { AIAssistantDataClientParams } from '..';
import type { EsDefendInsightSchema } from './types';

import { AIAssistantDataClient } from '..';
import { getDefendInsight } from './get_defend_insight';
import {
  transformESSearchToDefendInsights,
  transformToCreateScheme,
  transformToUpdateScheme,
} from './helpers';

export class DefendInsightsDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AIAssistantDataClientParams) {
    super(options);
  }

  /**
   * Fetches a Defend insight
   * @param options
   * @param options.id The existing Defend insight id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The Defend insight response
   */
  public getDefendInsight = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getDefendInsight({
      esClient,
      logger: this.options.logger,
      index: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Creates a Defend insight, if given at least the "apiConfig"
   * @param options
   * @param options.defendInsightCreate
   * @param options.authenticatedUser
   * @returns The Defend insight created
   */
  public createDefendInsight = async ({
    defendInsightCreate,
    authenticatedUser,
  }: {
    defendInsightCreate: DefendInsightCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;
    const id = defendInsightCreate?.id || uuidv4();
    const createdAt = new Date().toISOString();

    const body = transformToCreateScheme(createdAt, this.spaceId, user, defendInsightCreate);
    try {
      const response = await esClient.create({
        body,
        id,
        index,
        refresh: 'wait_for',
      });

      const createdDefendInsight = await getDefendInsight({
        esClient,
        index,
        id: response._id,
        logger,
        user,
      });
      return createdDefendInsight;
    } catch (err) {
      logger.error(`Error creating Defend insight: ${err} with id: ${id}`);
      throw err;
    }
  };

  /**
   * Find Defend insight by apiConfig connectorId
   * @param options
   * @param options.connectorId
   * @param options.authenticatedUser
   * @returns The Defend insight found
   */
  public findDefendInsightByConnectorId = async ({
    connectorId,
    authenticatedUser,
  }: {
    connectorId: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;

    try {
      const response = await esClient.search<EsDefendInsightSchema>({
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'api_config.connector_id': connectorId,
                      },
                    },
                  ],
                  must: [
                    {
                      match: user.profile_uid
                        ? { 'users.id': user.profile_uid }
                        : { 'users.name': user.username },
                    },
                  ],
                },
              },
            ],
          },
        },
        _source: true,
        ignore_unavailable: true,
        index,
        seq_no_primary_term: true,
      });
      const insights = transformESSearchToDefendInsights(response);
      return insights[0] ?? null;
    } catch (err) {
      logger.error(`Error fetching Defend insight: ${err} with connectorId: ${connectorId}`);
      throw err;
    }
  };

  /**
   * Finds all Defend insight for authenticated user
   * @param options
   * @param options.authenticatedUser
   * @returns The Defend insight
   */
  public findAllDefendInsights = async ({
    authenticatedUser,
  }: {
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;
    const MAX_ITEMS = 10000;

    try {
      const response = await esClient.search<EsDefendInsightSchema>({
        query: {
          bool: {
            must: [
              {
                match: user.profile_uid
                  ? { 'users.id': user.profile_uid }
                  : { 'users.name': user.username },
              },
            ],
          },
        },
        size: MAX_ITEMS,
        _source: true,
        ignore_unavailable: true,
        index,
        seq_no_primary_term: true,
      });
      const insights = transformESSearchToDefendInsights(response);
      return insights ?? [];
    } catch (err) {
      logger.error(`Error fetching Defend insights: ${err}`);
      throw err;
    }
  };

  /**
   * Updates a Defend insight
   * @param options
   * @param options.defendInsightUpdateProps
   * @param options.authenticatedUser
   */
  public updateDefendInsight = async ({
    defendInsightUpdateProps,
    authenticatedUser,
  }: {
    defendInsightUpdateProps: DefendInsightUpdateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = defendInsightUpdateProps.backingIndex;
    const user = authenticatedUser;
    const updatedAt = new Date().toISOString();

    const params = transformToUpdateScheme(updatedAt, defendInsightUpdateProps);
    try {
      await esClient.update({
        refresh: 'wait_for',
        index,
        id: params.id,
        doc: params,
      });

      const updatedDefendInsight = await getDefendInsight({
        esClient,
        index,
        id: params.id,
        logger,
        user,
      });

      return updatedDefendInsight;
    } catch (err) {
      logger.warn(`Error updating Defend insight: ${err} by ID: ${params.id}`);
      throw err;
    }
  };
}
