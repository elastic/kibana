/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient, Logger } from '../../../../../src/core/server';
import { AuthenticationProvider } from '../../common/types';
import { ConfigType } from '../config';

export interface SessionIndexOptions {
  clusterClient: ILegacyClusterClient;
  serverBasePath: string;
  config: Pick<ConfigType, 'session'>;
  logger: Logger;
}

/**
 * Version of the current session index template.
 */
const SESSION_INDEX_TEMPLATE_VERSION = 1;

/**
 * Alias of the Elasticsearch index that is used to store user session information.
 */
const SESSION_INDEX_ALIAS = '.kibana_security_session';

/**
 * Name of the Elasticsearch index that is used to store user session information.
 */
const SESSION_INDEX_NAME = `${SESSION_INDEX_ALIAS}_${SESSION_INDEX_TEMPLATE_VERSION}`;

/**
 * Index template that is used for the current version of the session index.
 */
const SESSION_INDEX_TEMPLATE = {
  name: `${SESSION_INDEX_ALIAS}_index_template_${SESSION_INDEX_TEMPLATE_VERSION}`,
  version: SESSION_INDEX_TEMPLATE_VERSION,
  template: {
    index_patterns: SESSION_INDEX_NAME,
    order: 1000,
    settings: {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0,
        auto_expand_replicas: '0-1',
        priority: 1000,
        refresh_interval: '1s',
        hidden: true,
      },
    },
    mappings: {
      dynamic: 'strict',
      properties: {
        username_hash: { type: 'keyword' },
        provider: { properties: { name: { type: 'keyword' }, type: { type: 'keyword' } } },
        path: { type: 'keyword' },
        idleTimeoutExpiration: { type: 'date' },
        lifespanExpiration: { type: 'date' },
        accessAgreementAcknowledged: { type: 'boolean' },
        content: { type: 'binary' },
      },
    },
    aliases: { [SESSION_INDEX_ALIAS]: {} },
  },
};

/**
 * Represents shape of the session value stored in the index.
 */
export interface SessionIndexValue {
  /**
   * Unique session ID.
   */
  sid: string;

  /**
   * Hash of the username. It's defined only if session is authenticated, otherwise session
   * is considered unauthenticated (e.g. intermediate session used during SSO handshake).
   */
  username_hash?: string;

  /**
   * Name and type of the provider this session belongs to.
   */
  provider: AuthenticationProvider;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the browser is closed.
   */
  idleTimeoutExpiration: number | null;

  /**
   * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
   * time can be extended indefinitely.
   */
  lifespanExpiration: number | null;

  /**
   * Kibana server base path the session was created for.
   */
  path: string;

  /**
   * Indicates whether user acknowledged access agreement or not.
   */
  accessAgreementAcknowledged?: boolean;

  /**
   * Content of the session value represented as an encrypted JSON string.
   */
  content: string;

  /**
   * Additional index specific information about the session value.
   */
  metadata: SessionIndexValueMetadata;
}

/**
 * Additional index specific information about the session value.
 */
interface SessionIndexValueMetadata {
  /**
   * Primary term of the last modification of the document.
   */
  primaryTerm: number;

  /**
   * Sequence number of the last modification of the document.
   */
  sequenceNumber: number;
}

export class SessionIndex {
  /**
   * Timeout after which session with the expired idle timeout _may_ be removed from the index
   * during regular cleanup routine. It's intentionally larger than `idleIndexUpdateTimeout`
   * configured in `Session` to be sure that the session value may be safely cleaned up.
   */
  readonly #idleIndexCleanupTimeout: number | null;

  /**
   * Options used to create Session index.
   */
  readonly #options: Readonly<SessionIndexOptions>;

  /**
   * Promise that tracks session index initialization process. We'll need to get rid of this as soon
   * as Core provides support for plugin statuses. With this we won't mark Security as `Green` until
   * index is fully initialized and hence consumers won't be able to call any API we provide.
   */
  private indexInitialization?: Promise<void>;

  constructor(options: Readonly<SessionIndexOptions>) {
    this.#options = options;
    this.#idleIndexCleanupTimeout = this.#options.config.session.idleTimeout
      ? this.#options.config.session.idleTimeout.asMilliseconds() * 3
      : null;
  }

  /**
   * Retrieves session value with the specified ID from the index. If session value isn't found
   * `null` will be returned.
   * @param sid Session ID.
   */
  async get(sid: string) {
    try {
      const response = await this.#options.clusterClient.callAsInternalUser('get', {
        id: sid,
        ignore: [404],
        index: SESSION_INDEX_ALIAS,
      });

      const docNotFound = response.found === false;
      const indexNotFound = response.status === 404;
      if (docNotFound || indexNotFound) {
        this.#options.logger.debug('Cannot find session value with the specified ID.');
        return null;
      }

      return {
        sid,
        ...response._source,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as Readonly<SessionIndexValue>;
    } catch (err) {
      this.#options.logger.error(`Failed to retrieve session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates a new document for the specified session value.
   * @param sessionValue Session index value.
   */
  async create(sessionValue: Readonly<Omit<SessionIndexValue, 'metadata'>>) {
    if (this.indexInitialization) {
      this.#options.logger.warn(
        'Attempted to create a new session while session index is initializing.'
      );
      await this.indexInitialization;
    }

    const { sid, ...sessionValueToStore } = sessionValue;
    try {
      const {
        _primary_term: primaryTerm,
        _seq_no: sequenceNumber,
      } = await this.#options.clusterClient.callAsInternalUser('create', {
        id: sid,
        // We cannot control whether index is created automatically during this operation or not.
        // But we can reduce probability of getting into a weird state when session is being created
        // while session index is missing for some reason. This way we'll recreate index with a
        // proper name and alias. But this will only work if we still have a proper index template.
        index: SESSION_INDEX_NAME,
        body: sessionValueToStore,
        refresh: 'wait_for',
      });

      return { ...sessionValue, metadata: { primaryTerm, sequenceNumber } } as SessionIndexValue;
    } catch (err) {
      this.#options.logger.error(`Failed to create session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Re-indexes updated session value.
   * @param sessionValue Session index value.
   */
  async update(sessionValue: Readonly<SessionIndexValue>) {
    const { sid, metadata, ...sessionValueToStore } = sessionValue;
    try {
      const response = await this.#options.clusterClient.callAsInternalUser('index', {
        id: sid,
        index: SESSION_INDEX_ALIAS,
        body: sessionValueToStore,
        ifSeqNo: metadata.sequenceNumber,
        ifPrimaryTerm: metadata.primaryTerm,
        refresh: 'wait_for',
        ignore: [409],
      });

      // We don't want to override changes that were made after we fetched session value or
      // re-create it if has been deleted already. If we detect such a case we discard changes and
      // return latest copy of the session value instead or `null` if doesn't exist anymore.
      const sessionIndexValueUpdateConflict = response.status === 409;
      if (sessionIndexValueUpdateConflict) {
        this.#options.logger.debug(
          'Cannot update session value due to conflict, session either do not exist or was already updated.'
        );
        return await this.get(sid);
      }

      return {
        ...sessionValue,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as SessionIndexValue;
    } catch (err) {
      this.#options.logger.error(`Failed to update session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Clears session value with the specified ID. May trigger a removal of other outdated session
   * values.
   * @param sid Session ID to clear.
   */
  async clear(sid: string) {
    try {
      const now = Date.now();

      // Always try to delete session with the specified ID and with expired lifespan (even if it's
      // not configured right now).
      // QUESTION: CAN WE SAY THAT ALL TENANTS SHOULD HAVE THE SAME SESSION TIMEOUTS?
      const deleteQueries: object[] = [
        { term: { _id: sid } },
        { range: { lifespanExpiration: { lte: now } } },
        // { bool: { must_not: { term: { path: this.#options.serverBasePath } } } },
      ];

      // If lifespan is configured we should remove sessions that were created without it if any.
      if (this.#options.config.session.lifespan) {
        deleteQueries.push({ bool: { must_not: { exists: { field: 'lifespanExpiration' } } } });
      }

      // If idle timeout is configured we should delete all sessions without specified idle timeout
      // or if that session hasn't been updated for a while meaning that session is expired.
      if (this.#idleIndexCleanupTimeout) {
        deleteQueries.push(
          { range: { idleTimeoutExpiration: { lte: now - this.#idleIndexCleanupTimeout } } },
          { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } }
        );
      } else {
        // Otherwise just delete all expired sessions that were previously created with the idle
        // timeout if any.
        deleteQueries.push({ range: { idleTimeoutExpiration: { lte: now } } });
      }

      await this.#options.clusterClient.callAsInternalUser('deleteByQuery', {
        index: SESSION_INDEX_ALIAS,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: { conflicts: 'proceed', query: { bool: { should: deleteQueries } } },
      });
    } catch (err) {
      this.#options.logger.error(`Failed to clear session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Initializes index that is used to store session values.
   */
  async initialize() {
    if (this.indexInitialization) {
      return await this.indexInitialization;
    }

    this.indexInitialization = new Promise(async (resolve) => {
      // Check if required index template exists.
      let indexTemplateExists = false;
      try {
        indexTemplateExists = await this.#options.clusterClient.callAsInternalUser(
          'indices.existsTemplate',
          { name: SESSION_INDEX_TEMPLATE.name }
        );
      } catch (err) {
        this.#options.logger.error(
          `Failed to check if session index template exists: ${err.message}`
        );
        throw err;
      }

      // Create index template if it doesn't exist.
      if (indexTemplateExists) {
        this.#options.logger.debug('Session index template already exists.');
      } else {
        try {
          await this.#options.clusterClient.callAsInternalUser('indices.putTemplate', {
            name: SESSION_INDEX_TEMPLATE.name,
            body: SESSION_INDEX_TEMPLATE.template,
          });
          this.#options.logger.debug('Successfully created session index template.');
        } catch (err) {
          this.#options.logger.error(`Failed to create session index template: ${err.message}`);
          throw err;
        }
      }

      // Check if required index exists. We cannot be sure that automatic creation of indices is
      // always enabled, so we create session index explicitly.
      let indexExists = false;
      try {
        indexExists = await this.#options.clusterClient.callAsInternalUser('indices.exists', {
          index: SESSION_INDEX_NAME,
        });
      } catch (err) {
        this.#options.logger.error(`Failed to check if session index exists: ${err.message}`);
        throw err;
      }

      // Create index if it doesn't exist.
      if (indexExists) {
        this.#options.logger.debug('Session index already exists.');
      } else {
        try {
          await this.#options.clusterClient.callAsInternalUser('indices.create', {
            index: SESSION_INDEX_NAME,
          });
          this.#options.logger.debug('Successfully created session index.');
        } catch (err) {
          this.#options.logger.error(`Failed to create session index: ${err.message}`);
          throw err;
        }
      }

      // Notify any consumers that are awaiting on this promise and immediately reset it.
      resolve();
      this.indexInitialization = undefined;
    });
  }
}
