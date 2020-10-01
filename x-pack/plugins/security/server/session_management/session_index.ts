/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient, Logger } from '../../../../../src/core/server';
import { AuthenticationProvider } from '../../common/types';
import { ConfigType } from '../config';

export interface SessionIndexOptions {
  readonly clusterClient: ILegacyClusterClient;
  readonly kibanaIndexName: string;
  readonly config: Pick<ConfigType, 'session'>;
  readonly logger: Logger;
}

/**
 * Version of the current session index template.
 */
const SESSION_INDEX_TEMPLATE_VERSION = 1;

/**
 * Returns index template that is used for the current version of the session index.
 */
export function getSessionIndexTemplate(indexName: string) {
  return Object.freeze({
    index_patterns: indexName,
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
        usernameHash: { type: 'keyword' },
        provider: { properties: { name: { type: 'keyword' }, type: { type: 'keyword' } } },
        idleTimeoutExpiration: { type: 'date' },
        lifespanExpiration: { type: 'date' },
        accessAgreementAcknowledged: { type: 'boolean' },
        content: { type: 'binary' },
      },
    },
  });
}

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
  usernameHash?: string;

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
   * Name of the index to store session information in.
   */
  private readonly indexName = `${this.options.kibanaIndexName}_security_session_${SESSION_INDEX_TEMPLATE_VERSION}`;

  /**
   * Timeout after which session with the expired idle timeout _may_ be removed from the index
   * during regular cleanup routine.
   */
  private readonly idleIndexCleanupTimeout: number | null;

  /**
   * Promise that tracks session index initialization process. We'll need to get rid of this as soon
   * as Core provides support for plugin statuses (https://github.com/elastic/kibana/issues/41983).
   * With this we won't mark Security as `Green` until index is fully initialized and hence consumers
   * won't be able to call any APIs we provide.
   */
  private indexInitialization?: Promise<void>;

  constructor(private readonly options: Readonly<SessionIndexOptions>) {
    // This timeout is intentionally larger than the `idleIndexUpdateTimeout` (idleTimeout * 2)
    // configured in `Session` to be sure that the session value is definitely expired and may be
    // safely cleaned up.
    this.idleIndexCleanupTimeout = this.options.config.session.idleTimeout
      ? this.options.config.session.idleTimeout.asMilliseconds() * 3
      : null;
  }

  /**
   * Retrieves session value with the specified ID from the index. If session value isn't found
   * `null` will be returned.
   * @param sid Session ID.
   */
  async get(sid: string) {
    try {
      const response = await this.options.clusterClient.callAsInternalUser('get', {
        id: sid,
        ignore: [404],
        index: this.indexName,
      });

      const docNotFound = response.found === false;
      const indexNotFound = response.status === 404;
      if (docNotFound || indexNotFound) {
        this.options.logger.debug('Cannot find session value with the specified ID.');
        return null;
      }

      return {
        ...response._source,
        sid,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as Readonly<SessionIndexValue>;
    } catch (err) {
      this.options.logger.error(`Failed to retrieve session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates a new document for the specified session value.
   * @param sessionValue Session index value.
   */
  async create(sessionValue: Readonly<Omit<SessionIndexValue, 'metadata'>>) {
    if (this.indexInitialization) {
      this.options.logger.warn(
        'Attempted to create a new session while session index is initializing.'
      );
      await this.indexInitialization;
    }

    const { sid, ...sessionValueToStore } = sessionValue;
    try {
      const {
        _primary_term: primaryTerm,
        _seq_no: sequenceNumber,
      } = await this.options.clusterClient.callAsInternalUser('create', {
        id: sid,
        // We cannot control whether index is created automatically during this operation or not.
        // But we can reduce probability of getting into a weird state when session is being created
        // while session index is missing for some reason. This way we'll recreate index with a
        // proper name and alias. But this will only work if we still have a proper index template.
        index: this.indexName,
        body: sessionValueToStore,
        refresh: 'wait_for',
      });

      return { ...sessionValue, metadata: { primaryTerm, sequenceNumber } } as SessionIndexValue;
    } catch (err) {
      this.options.logger.error(`Failed to create session value: ${err.message}`);
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
      const response = await this.options.clusterClient.callAsInternalUser('index', {
        id: sid,
        index: this.indexName,
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
        this.options.logger.debug(
          'Cannot update session value due to conflict, session either does not exist or was already updated.'
        );
        return await this.get(sid);
      }

      return {
        ...sessionValue,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as SessionIndexValue;
    } catch (err) {
      this.options.logger.error(`Failed to update session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Clears session value with the specified ID.
   * @param sid Session ID to clear.
   */
  async clear(sid: string) {
    try {
      // We don't specify primary term and sequence number as delete should always take precedence
      // over any updates that could happen in the meantime.
      await this.options.clusterClient.callAsInternalUser('delete', {
        id: sid,
        index: this.indexName,
        refresh: 'wait_for',
        ignore: [404],
      });
    } catch (err) {
      this.options.logger.error(`Failed to clear session value: ${err.message}`);
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

    const sessionIndexTemplateName = `${this.options.kibanaIndexName}_security_session_index_template_${SESSION_INDEX_TEMPLATE_VERSION}`;
    return (this.indexInitialization = new Promise(async (resolve) => {
      // Check if required index template exists.
      let indexTemplateExists = false;
      try {
        indexTemplateExists = await this.options.clusterClient.callAsInternalUser(
          'indices.existsTemplate',
          { name: sessionIndexTemplateName }
        );
      } catch (err) {
        this.options.logger.error(
          `Failed to check if session index template exists: ${err.message}`
        );
        throw err;
      }

      // Create index template if it doesn't exist.
      if (indexTemplateExists) {
        this.options.logger.debug('Session index template already exists.');
      } else {
        try {
          await this.options.clusterClient.callAsInternalUser('indices.putTemplate', {
            name: sessionIndexTemplateName,
            body: getSessionIndexTemplate(this.indexName),
          });
          this.options.logger.debug('Successfully created session index template.');
        } catch (err) {
          this.options.logger.error(`Failed to create session index template: ${err.message}`);
          throw err;
        }
      }

      // Check if required index exists. We cannot be sure that automatic creation of indices is
      // always enabled, so we create session index explicitly.
      let indexExists = false;
      try {
        indexExists = await this.options.clusterClient.callAsInternalUser('indices.exists', {
          index: this.indexName,
        });
      } catch (err) {
        this.options.logger.error(`Failed to check if session index exists: ${err.message}`);
        throw err;
      }

      // Create index if it doesn't exist.
      if (indexExists) {
        this.options.logger.debug('Session index already exists.');
      } else {
        try {
          await this.options.clusterClient.callAsInternalUser('indices.create', {
            index: this.indexName,
          });
          this.options.logger.debug('Successfully created session index.');
        } catch (err) {
          // There can be a race condition if index is created by another Kibana instance.
          if (err?.body?.error?.type === 'resource_already_exists_exception') {
            this.options.logger.debug('Session index already exists.');
          } else {
            this.options.logger.error(`Failed to create session index: ${err.message}`);
            throw err;
          }
        }
      }

      // Notify any consumers that are awaiting on this promise and immediately reset it.
      resolve();
      this.indexInitialization = undefined;
    }));
  }

  /**
   * Trigger a removal of any outdated session values.
   */
  async cleanUp() {
    this.options.logger.debug(`Running cleanup routine.`);

    const now = Date.now();

    // Always try to delete sessions with expired lifespan (even if it's not configured right now).
    const deleteQueries: object[] = [{ range: { lifespanExpiration: { lte: now } } }];

    // If lifespan is configured we should remove any sessions that were created without one.
    if (this.options.config.session.lifespan) {
      deleteQueries.push({ bool: { must_not: { exists: { field: 'lifespanExpiration' } } } });
    }

    // If idle timeout is configured we should delete all sessions without specified idle timeout
    // or if that session hasn't been updated for a while meaning that session is expired.
    if (this.idleIndexCleanupTimeout) {
      deleteQueries.push(
        { range: { idleTimeoutExpiration: { lte: now - this.idleIndexCleanupTimeout } } },
        { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } }
      );
    } else {
      // Otherwise just delete all expired sessions that were previously created with the idle
      // timeout.
      deleteQueries.push({ range: { idleTimeoutExpiration: { lte: now } } });
    }

    try {
      const response = await this.options.clusterClient.callAsInternalUser('deleteByQuery', {
        index: this.indexName,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: { query: { bool: { should: deleteQueries } } },
      });

      if (response.deleted > 0) {
        this.options.logger.debug(
          `Cleaned up ${response.deleted} invalid or expired session values.`
        );
      }
    } catch (err) {
      this.options.logger.error(`Failed to clean up sessions: ${err.message}`);
      throw err;
    }
  }
}
