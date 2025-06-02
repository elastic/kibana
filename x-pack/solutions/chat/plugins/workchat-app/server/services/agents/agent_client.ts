/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectsClientContract, Logger, SavedObject } from '@kbn/core/server';
import type { UserNameAndId } from '../../../common/shared';
import type { Agent, AgentCreateRequest } from '../../../common/agents';
import { agentTypeName, type AgentAttributes } from '../../saved_objects/agents';
import { WorkchatError } from '../../errors';
import { createBuilder } from '../../utils/so_filters';
import { savedObjectToModel, createRequestToRaw, updateToAttributes } from './convert_model';
import { getRandomColorFromPalette } from '../../utils/color';

interface AgentClientOptions {
  logger: Logger;
  client: SavedObjectsClientContract;
  user: UserNameAndId;
}

export type AgentUpdatableFields = Partial<
  Pick<Agent, 'name' | 'description' | 'configuration' | 'public' | 'avatar'>
>;

/**
 * Agent client scoped to a current user.
 * All APIs exposed by the client are performing actions on behalf of the user,
 * only accessing/returning agents that are accessible to the user.
 */
export interface AgentClient {
  /**
   * Returns all the agents available to the current user.
   */
  list(): Promise<Agent[]>;
  /**
   * Get an agent by id, if the current user is allowed to access it
   */
  get(options: { agentId: string }): Promise<Agent>;
  /**
   * Creates an agent bound to the current user and returns it.
   */
  create(request: AgentCreateRequest): Promise<Agent>;
  /**
   * Updates an agent and returns it.
   */
  update(agentId: string, fields: AgentUpdatableFields): Promise<Agent>;

  /**
   * Deletes an agent.
   */
  delete(agentId: string): Promise<boolean>;
}

export class AgentClientImpl implements AgentClient {
  private readonly client: SavedObjectsClientContract;
  private readonly user: UserNameAndId;
  // @ts-expect-error will be used at some point
  private readonly logger: Logger;

  constructor({ client, user, logger }: AgentClientOptions) {
    this.client = client;
    this.user = user;
    this.logger = logger;
  }

  async list(): Promise<Agent[]> {
    const builder = createBuilder(agentTypeName);
    const filter = builder
      .or(builder.equals('user_id', this.user.id), builder.equals('access_control.public', true))
      .toKQL();

    const { saved_objects: results } = await this.client.find<AgentAttributes>({
      type: agentTypeName,
      filter,
      perPage: 1000,
    });

    return results.map(savedObjectToModel);
  }

  async get({ agentId }: { agentId: string }): Promise<Agent> {
    const conversationSo = await this._rawGet({ agentId });
    return savedObjectToModel(conversationSo);
  }

  async create(createRequest: AgentCreateRequest): Promise<Agent> {
    const now = new Date();
    const id = createRequest.id ?? uuidv4();
    const color = createRequest.avatar?.color ?? getRandomColorFromPalette();
    const attributes = createRequestToRaw({
      createRequest,
      id,
      user: this.user,
      creationDate: now,
      color,
    });

    const created = await this.client.create<AgentAttributes>(agentTypeName, attributes, { id });
    return savedObjectToModel(created);
  }

  async update(agentId: string, updatedFields: AgentUpdatableFields): Promise<Agent> {
    const conversationSo = await this._rawGet({ agentId });
    const updatedAttributes = {
      ...conversationSo.attributes,
      ...updateToAttributes({ updatedFields }),
    };

    await this.client.update<AgentAttributes>(agentTypeName, conversationSo.id, updatedAttributes);

    return savedObjectToModel({
      ...conversationSo,
      attributes: updatedAttributes,
    });
  }

  async delete(agentId: string): Promise<boolean> {
    let conversationSo: SavedObject<AgentAttributes>;
    try {
      conversationSo = await this._rawGet({ agentId });
    } catch (e) {
      if (e instanceof WorkchatError && e.statusCode === 404) {
        return false;
      } else {
        throw e;
      }
    }
    await this.client.delete(agentTypeName, conversationSo.id);
    return true;
  }

  private async _rawGet({ agentId }: { agentId: string }): Promise<SavedObject<AgentAttributes>> {
    const builder = createBuilder(agentTypeName);

    const filter = builder
      .and(
        builder.equals('agent_id', agentId),
        builder.or(
          builder.equals('user_id', this.user.id),
          builder.equals('access_control.public', true)
        )
      )
      .toKQL();

    const { saved_objects: results } = await this.client.find<AgentAttributes>({
      type: agentTypeName,
      filter,
    });
    if (results.length > 0) {
      return results[0];
    }
    throw new WorkchatError(`Conversation ${agentId} not found`, 404);
  }
}
