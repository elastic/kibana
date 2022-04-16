/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import semver from 'semver';
import LRU from 'lru-cache';
import { isEqual, isEmpty } from 'lodash';
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { ListResult } from '@kbn/fleet-plugin/common';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { ExceptionListClient } from '@kbn/lists-plugin/server';
import { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import {
  manifestDispatchSchema,
  ManifestSchema,
} from '../../../../../common/endpoint/schema/manifest';

import {
  ArtifactConstants,
  buildArtifact,
  getArtifactId,
  getEndpointExceptionList,
  Manifest,
  ArtifactListId,
} from '../../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../../schemas/artifacts';
import { EndpointArtifactClientInterface } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { InvalidInternalManifestError } from '../errors';
import { wrapErrorIfNeeded } from '../../../utils';
import { EndpointError } from '../../../../../common/endpoint/errors';

interface ArtifactsBuildResult {
  defaultArtifacts: InternalArtifactCompleteSchema[];
  policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]>;
}

interface BuildArtifactsForOsOptions {
  listId: ArtifactListId;
  name: string;
}

const iterateArtifactsBuildResult = async (
  result: ArtifactsBuildResult,
  callback: (artifact: InternalArtifactCompleteSchema, policyId?: string) => Promise<void>
) => {
  for (const artifact of result.defaultArtifacts) {
    await callback(artifact);
  }

  for (const policyId of Object.keys(result.policySpecificArtifacts)) {
    for (const artifact of result.policySpecificArtifacts[policyId]) {
      await callback(artifact, policyId);
    }
  }
};

const iterateAllListItems = async <T>(
  pageSupplier: (page: number) => Promise<ListResult<T>>,
  itemCallback: (item: T) => void
) => {
  let paging = true;
  let page = 1;

  while (paging) {
    const { items, total } = await pageSupplier(page);

    for (const item of items) {
      await itemCallback(item);
    }

    paging = (page - 1) * 20 + items.length < total;
    page++;
  }
};

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: EndpointArtifactClientInterface;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyServiceInterface;
  logger: Logger;
  cache: LRU<string, Buffer>;
  experimentalFeatures: ExperimentalFeatures;
}

const getArtifactIds = (manifest: ManifestSchema) =>
  [...Object.keys(manifest.artifacts)].map(
    (key) => `${key}-${manifest.artifacts[key].decoded_sha256}`
  );

const manifestsEqual = (manifest1: ManifestSchema, manifest2: ManifestSchema) =>
  isEqual(new Set(getArtifactIds(manifest1)), new Set(getArtifactIds(manifest2)));

export class ManifestManager {
  protected artifactClient: EndpointArtifactClientInterface;
  protected exceptionListClient: ExceptionListClient;
  protected packagePolicyService: PackagePolicyServiceInterface;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected cache: LRU<string, Buffer>;
  protected schemaVersion: ManifestSchemaVersion;
  protected experimentalFeatures: ExperimentalFeatures;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packagePolicyService = context.packagePolicyService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
    this.schemaVersion = 'v1';
    this.experimentalFeatures = context.experimentalFeatures;
  }

  /**
   * Gets a ManifestClient for this manager's schemaVersion.
   *
   * @returns {ManifestClient} A ManifestClient scoped to the appropriate schemaVersion.
   */
  protected getManifestClient(): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, this.schemaVersion);
  }

  /**
   * Builds an artifact (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   */
  protected async buildExceptionListArtifact(os: string): Promise<InternalArtifactCompleteSchema> {
    return buildArtifact(
      await getEndpointExceptionList({
        elClient: this.exceptionListClient,
        schemaVersion: this.schemaVersion,
        os,
      }),
      this.schemaVersion,
      os,
      ArtifactConstants.GLOBAL_ALLOWLIST_NAME
    );
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildExceptionListArtifact(os));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        policySpecificArtifacts[policyId] = defaultArtifacts;
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an artifact (one per supported OS) based on the current state of the
   * artifacts list (Trusted Apps, Host Iso. Exceptions, Event Filters, Blocklists)
   * (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildArtifactsForOs({
    listId,
    name,
    os,
    policyId,
  }: {
    os: string;
    policyId?: string;
  } & BuildArtifactsForOsOptions): Promise<InternalArtifactCompleteSchema> {
    return buildArtifact(
      await getEndpointExceptionList({
        elClient: this.exceptionListClient,
        schemaVersion: this.schemaVersion,
        os,
        policyId,
        listId,
      }),
      this.schemaVersion,
      os,
      name
    );
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildTrustedAppsArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      name: ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(
            await this.buildArtifactsForOs({ os, policyId, ...buildArtifactsForOsOptions })
          );
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint event filters (one per supported OS) based on the current state of the
   * Event Filters list
   * @protected
   */
  protected async buildEventFiltersArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
      name: ArtifactConstants.GLOBAL_EVENT_FILTERS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(
            await this.buildArtifactsForOs({ os, policyId, ...buildArtifactsForOsOptions })
          );
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of Blocklist entries (one per supported OS) based on the current state of the
   * Blocklist list
   * @protected
   */
  protected async buildBlocklistArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_BLOCKLISTS_LIST_ID,
      name: ArtifactConstants.GLOBAL_BLOCKLISTS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(
            await this.buildArtifactsForOs({ os, policyId, ...buildArtifactsForOsOptions })
          );
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint host isolation exception (one per supported OS) based on the current state of the
   * Host Isolation Exception List
   * @returns
   */

  protected async buildHostIsolationExceptionsArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      name: ArtifactConstants.GLOBAL_HOST_ISOLATION_EXCEPTIONS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(
            await this.buildArtifactsForOs({ os, policyId, ...buildArtifactsForOsOptions })
          );
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Writes new artifact SO.
   *
   * @param artifact An InternalArtifactCompleteSchema representing the artifact.
   * @returns {Promise<[Error | null, InternalArtifactCompleteSchema | undefined]>} An array with the error if encountered or null and the generated artifact or null.
   */
  protected async pushArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<[Error | null, InternalArtifactCompleteSchema | undefined]> {
    const artifactId = getArtifactId(artifact);
    let fleetArtifact;
    try {
      // Write the artifact SO
      fleetArtifact = await this.artifactClient.createArtifact(artifact);

      // Cache the compressed body of the artifact
      this.cache.set(artifactId, Buffer.from(artifact.body, 'base64'));
    } catch (err) {
      if (this.savedObjectsClient.errors.isConflictError(err)) {
        this.logger.debug(`Tried to create artifact ${artifactId}, but it already exists.`);
      } else {
        return [err, undefined];
      }
    }

    return [null, fleetArtifact];
  }

  /**
   * Writes new artifact SOs.
   *
   * @param artifacts An InternalArtifactCompleteSchema array representing the artifacts.
   * @param newManifest A Manifest representing the new manifest
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async pushArtifacts(
    artifacts: InternalArtifactCompleteSchema[],
    newManifest: Manifest
  ): Promise<Error[]> {
    const errors: Error[] = [];
    for (const artifact of artifacts) {
      if (internalArtifactCompleteSchema.is(artifact)) {
        const [err, fleetArtifact] = await this.pushArtifact(artifact);
        if (err) {
          errors.push(err);
        } else if (fleetArtifact) {
          newManifest.replaceArtifact(fleetArtifact);
        }
      } else {
        errors.push(new EndpointError(`Incomplete artifact: ${getArtifactId(artifact)}`, artifact));
      }
    }
    return errors;
  }

  /**
   * Deletes outdated artifact SOs.
   *
   * The artifact may still remain in the cache.
   *
   * @param artifactIds The IDs of the artifact to delete..
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async deleteArtifacts(artifactIds: string[]): Promise<Error[]> {
    const errors: Error[] = [];
    for (const artifactId of artifactIds) {
      try {
        await this.artifactClient.deleteArtifact(artifactId);
        this.logger.info(`Cleaned up artifact ${artifactId}`);
      } catch (err) {
        errors.push(err);
      }
    }
    return errors;
  }

  /**
   * Returns the last computed manifest based on the state of the user-artifact-manifest SO. If no
   * artifacts have been created yet (ex. no Endpoint policies are in use), then method return `null`
   *
   * @returns {Promise<Manifest | null>} The last computed manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastComputedManifest(): Promise<Manifest | null> {
    try {
      const manifestSo = await this.getManifestClient().getManifest();

      if (manifestSo.version === undefined) {
        throw new InvalidInternalManifestError(
          'Internal Manifest map SavedObject is missing version',
          manifestSo
        );
      }

      const manifest = new Manifest({
        schemaVersion: this.schemaVersion,
        semanticVersion: manifestSo.attributes.semanticVersion,
        soVersion: manifestSo.version,
      });

      for (const entry of manifestSo.attributes.artifacts) {
        const artifact = await this.artifactClient.getArtifact(entry.artifactId);

        if (!artifact) {
          this.logger.error(
            new InvalidInternalManifestError(`artifact id [${entry.artifactId}] not found!`, {
              entry,
              action: 'removed from internal ManifestManger tracking map',
            })
          );
        } else {
          manifest.addEntry(artifact, entry.policyId);
        }
      }

      return manifest;
    } catch (error) {
      if (!error.output || error.output.statusCode !== 404) {
        throw wrapErrorIfNeeded(error);
      }
      return null;
    }
  }

  /**
   * creates a new default Manifest
   */
  public static createDefaultManifest(schemaVersion?: ManifestSchemaVersion): Manifest {
    return Manifest.getDefault(schemaVersion);
  }

  /**
   * Builds a new manifest based on the current user exception list.
   *
   * @param baselineManifest A baseline manifest to use for initializing pre-existing artifacts.
   * @returns {Promise<Manifest>} A new Manifest object representing the current exception list.
   */
  public async buildNewManifest(
    baselineManifest: Manifest = ManifestManager.createDefaultManifest(this.schemaVersion)
  ): Promise<Manifest> {
    const results = await Promise.all([
      this.buildExceptionListArtifacts(),
      this.buildTrustedAppsArtifacts(),
      this.buildEventFiltersArtifacts(),
      this.buildHostIsolationExceptionsArtifacts(),
      this.buildBlocklistArtifacts(),
    ]);

    const manifest = new Manifest({
      schemaVersion: this.schemaVersion,
      semanticVersion: baselineManifest.getSemanticVersion(),
      soVersion: baselineManifest.getSavedObjectVersion(),
    });

    for (const result of results) {
      await iterateArtifactsBuildResult(result, async (artifact, policyId) => {
        const artifactToAdd = baselineManifest.getArtifact(getArtifactId(artifact)) || artifact;
        if (!internalArtifactCompleteSchema.is(artifactToAdd)) {
          throw new EndpointError(
            `Incomplete artifact detected: ${getArtifactId(artifactToAdd)}`,
            artifactToAdd
          );
        }

        manifest.addEntry(artifactToAdd, policyId);
      });
    }

    return manifest;
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package policy, if different
   * from the manifest already in the config.
   *
   * @param manifest The Manifest to dispatch.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async tryDispatch(manifest: Manifest): Promise<Error[]> {
    const errors: Error[] = [];

    await iterateAllListItems(
      (page) => this.listEndpointPolicies(page),
      async (packagePolicy) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, revision, updated_at, updated_by, ...newPackagePolicy } = packagePolicy;
        if (newPackagePolicy.inputs.length > 0 && newPackagePolicy.inputs[0].config !== undefined) {
          const oldManifest = newPackagePolicy.inputs[0].config.artifact_manifest ?? {
            value: {},
          };

          const newManifestVersion = manifest.getSemanticVersion();
          if (semver.gt(newManifestVersion, oldManifest.value.manifest_version)) {
            const serializedManifest = manifest.toPackagePolicyManifest(packagePolicy.id);

            if (!manifestDispatchSchema.is(serializedManifest)) {
              errors.push(
                new EndpointError(
                  `Invalid manifest for policy ${packagePolicy.id}`,
                  serializedManifest
                )
              );
            } else if (!manifestsEqual(serializedManifest, oldManifest.value)) {
              newPackagePolicy.inputs[0].config.artifact_manifest = { value: serializedManifest };

              try {
                await this.packagePolicyService.update(
                  this.savedObjectsClient,
                  // @ts-expect-error TS2345
                  undefined,
                  id,
                  newPackagePolicy
                );
                this.logger.debug(
                  `Updated package policy ${id} with manifest version ${manifest.getSemanticVersion()}`
                );
              } catch (err) {
                errors.push(err);
              }
            } else {
              this.logger.debug(
                `No change in manifest content for package policy: ${id}. Staying on old version`
              );
            }
          } else {
            this.logger.debug(`No change in manifest version for package policy: ${id}`);
          }
        } else {
          errors.push(
            new EndpointError(`Package Policy ${id} has no 'inputs[0].config'`, newPackagePolicy)
          );
        }
      }
    );

    return errors;
  }

  /**
   * Commits a manifest to indicate that a new version has been computed.
   *
   * @param manifest The Manifest to commit.
   * @returns {Promise<Error | null>} An error, if encountered, or null.
   */
  public async commit(manifest: Manifest) {
    const manifestClient = this.getManifestClient();

    // Commit the new manifest
    const manifestSo = manifest.toSavedObject();
    const version = manifest.getSavedObjectVersion();

    if (version == null) {
      await manifestClient.createManifest(manifestSo);
    } else {
      await manifestClient.updateManifest(manifestSo, {
        version,
      });
    }

    this.logger.info(`Committed manifest ${manifest.getSemanticVersion()}`);
  }

  private async listEndpointPolicies(page: number) {
    return this.packagePolicyService.list(this.savedObjectsClient, {
      page,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  private async listEndpointPolicyIds(page: number) {
    return this.packagePolicyService.listIds(this.savedObjectsClient, {
      page,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  public getArtifactsClient(): EndpointArtifactClientInterface {
    return this.artifactClient;
  }

  /**
   * Cleanup .fleet-artifacts index if there are some orphan artifacts
   */
  public async cleanup(manifest: Manifest) {
    try {
      const fleetArtifacts = [];
      const perPage = 100;
      let page = 1;

      let fleetArtifactsResponse = await this.artifactClient.listArtifacts({
        perPage,
        page,
      });
      fleetArtifacts.push(...fleetArtifactsResponse.items);

      while (
        fleetArtifactsResponse.total > fleetArtifacts.length &&
        !isEmpty(fleetArtifactsResponse.items)
      ) {
        page += 1;
        fleetArtifactsResponse = await this.artifactClient.listArtifacts({
          perPage,
          page,
        });
        fleetArtifacts.push(...fleetArtifactsResponse.items);
      }

      if (isEmpty(fleetArtifacts)) {
        return;
      }

      const badArtifacts = [];

      const manifestArtifactsIds = manifest
        .getAllArtifacts()
        .map((artifact) => getArtifactId(artifact));

      for (const fleetArtifact of fleetArtifacts) {
        const artifactId = getArtifactId(fleetArtifact);
        const isArtifactInManifest = manifestArtifactsIds.includes(artifactId);

        if (!isArtifactInManifest) {
          badArtifacts.push(fleetArtifact);
        }
      }

      if (isEmpty(badArtifacts)) {
        return;
      }

      this.logger.error(
        new EndpointError(`Cleaning up ${badArtifacts.length} orphan artifacts`, badArtifacts)
      );

      await pMap(
        badArtifacts,
        async (badArtifact) => this.artifactClient.deleteArtifact(getArtifactId(badArtifact)),
        {
          concurrency: 5,
          /** When set to false, instead of stopping when a promise rejects, it will wait for all the promises to
           * settle and then reject with an aggregated error containing all the errors from the rejected promises. */
          stopOnError: false,
        }
      );

      this.logger.info(`All orphan artifacts has been removed successfully`);
    } catch (error) {
      this.logger.error(new EndpointError('There was an error cleaning orphan artifacts', error));
    }
  }
}
