/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs';

import { promisify } from 'util';
import path from 'path';

import { merge } from '@kbn/std';
import yaml from 'js-yaml';
import { pick } from 'lodash';
import semverMajor from 'semver/functions/major';
import semverPrerelease from 'semver/functions/prerelease';

import type {
  ArchivePackage,
  RegistryPolicyTemplate,
  RegistryDataStream,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
  PackageSpecManifest,
} from '../../../../common/types';
import {
  RegistryInputKeys,
  RegistryVarsEntryKeys,
  RegistryPolicyTemplateKeys,
  RegistryStreamKeys,
  RegistryDataStreamKeys,
} from '../../../../common/types';
import { PackageInvalidArchiveError } from '../../../errors';
import { pkgToPkgKey } from '../registry';

import { unpackBufferEntries } from '.';

const readFileAsync = promisify(readFile);
const MANIFEST_NAME = 'manifest.yml';

const DEFAULT_RELEASE_VALUE = 'ga';

// Ingest pipelines are specified in a `data_stream/<name>/elasticsearch/ingest_pipeline/` directory where a `default`
// ingest pipeline should be specified by one of these filenames.
const DEFAULT_INGEST_PIPELINE_VALUE = 'default';
const DEFAULT_INGEST_PIPELINE_FILE_NAME_YML = 'default.yml';
const DEFAULT_INGEST_PIPELINE_FILE_NAME_JSON = 'default.json';

// Borrowed from https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/common/utils/expand_dotted.ts
// with some alterations around non-object values. The package registry service expands some dotted fields from manifest files,
// so we need to do the same here.
const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');

  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

export const expandDottedObject = (dottedObj: object = {}) => {
  if (typeof dottedObj !== 'object' || Array.isArray(dottedObj)) {
    return dottedObj;
  }
  return Object.entries(dottedObj).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {} as Record<string, any>
  );
};

export const expandDottedEntries = (obj: object) => {
  return Object.entries<any>(obj).reduce<any>((acc, [key, value]) => {
    acc[key] = expandDottedObject(value);

    return acc;
  }, {} as Record<string, any>);
};

type ManifestMap = Record<string, Buffer>;

// not sure these are 100% correct but they do the job here
// keeping them local until others need them
type OptionalPropertyOf<T extends object> = Exclude<
  {
    [K in keyof T]: T extends Record<K, T[K]> ? never : K;
  }[keyof T],
  undefined
>;
type RequiredPropertyOf<T extends object> = Exclude<keyof T, OptionalPropertyOf<T>>;

type RequiredPackageProp = RequiredPropertyOf<ArchivePackage>;
type OptionalPackageProp = OptionalPropertyOf<ArchivePackage>;
// pro: guarantee only supplying known values. these keys must be in ArchivePackage. no typos or new values
// pro: any values added to these lists will be passed through by default
// pro & con: values do need to be shadowed / repeated from ArchivePackage, but perhaps we want to limit values
const requiredArchivePackageProps: readonly RequiredPackageProp[] = [
  'name',
  'version',
  'description',
  'title',
  'format_version',
  'owner',
] as const;

const optionalArchivePackageProps: readonly OptionalPackageProp[] = [
  'readme',
  'assets',
  'data_streams',
  'license',
  'type',
  'categories',
  'conditions',
  'screenshots',
  'icons',
  'policy_templates',
  'release',
  'elasticsearch',
] as const;

const registryInputProps = Object.values(RegistryInputKeys);
const registryVarsProps = Object.values(RegistryVarsEntryKeys);
const registryPolicyTemplateProps = Object.values(RegistryPolicyTemplateKeys);
const registryStreamProps = Object.values(RegistryStreamKeys);
const registryDataStreamProps = Object.values(RegistryDataStreamKeys);

/*
  This function generates a package info object (see type `ArchivePackage`) by parsing and verifying the `manifest.yml` file as well
  as the directory structure for the given package archive and other files adhering to the package spec: https://github.com/elastic/package-spec.

  Currently, this process is duplicative of logic that's already implemented in the Package Registry codebase,
  e.g. https://github.com/elastic/package-registry/blob/main/packages/package.go. Because of this duplication, it's likely for our parsing/verification
  logic to fall out of sync with the registry codebase's implementation.

  This should be addressed in https://github.com/elastic/kibana/issues/115032
  where we'll no longer use the package registry endpoint as a source of truth for package info objects, and instead Fleet will _always_ generate
  them in the manner implemented below.
*/
export async function generatePackageInfoFromArchiveBuffer(
  archiveBuffer: Buffer,
  contentType: string
): Promise<{ paths: string[]; packageInfo: ArchivePackage }> {
  const manifests: ManifestMap = {};
  const entries = await unpackBufferEntries(archiveBuffer, contentType);
  const paths: string[] = [];
  entries.forEach(({ path: bufferPath, buffer }) => {
    paths.push(bufferPath);
    if (bufferPath.endsWith(MANIFEST_NAME) && buffer) manifests[bufferPath] = buffer;
  });

  return {
    packageInfo: parseAndVerifyArchive(paths, manifests),
    paths,
  };
}

/*
This is a util function for verifying packages from a directory not an archive.
It is only to be called from test scripts.
*/
export async function _generatePackageInfoFromPaths(
  paths: string[],
  topLevelDir: string
): Promise<ArchivePackage> {
  const manifests: ManifestMap = {};
  await Promise.all(
    paths.map(async (filePath) => {
      if (filePath.endsWith(MANIFEST_NAME)) manifests[filePath] = await readFileAsync(filePath);
    })
  );
  return parseAndVerifyArchive(paths, manifests, topLevelDir);
}

function parseAndVerifyArchive(
  paths: string[],
  manifests: ManifestMap,
  topLevelDirOverride?: string
): ArchivePackage {
  // The top-level directory must match pkgName-pkgVersion, and no other top-level files or directories may be present
  const toplevelDir = topLevelDirOverride || paths[0].split('/')[0];
  paths.forEach((filePath) => {
    if (!filePath.startsWith(toplevelDir)) {
      throw new PackageInvalidArchiveError('Package contains more than one top-level directory.');
    }
  });

  // The package must contain a manifest file ...
  const manifestFile = path.posix.join(toplevelDir, MANIFEST_NAME);
  const manifestBuffer = manifests[manifestFile];
  if (!paths.includes(manifestFile) || !manifestBuffer) {
    throw new PackageInvalidArchiveError(`Package must contain a top-level ${MANIFEST_NAME} file.`);
  }

  // ... which must be valid YAML
  let manifest: ArchivePackage;
  try {
    manifest = yaml.safeLoad(manifestBuffer.toString());
  } catch (error) {
    throw new PackageInvalidArchiveError(`Could not parse top-level package manifest: ${error}.`);
  }

  // must have mandatory fields
  const reqGiven = pick(manifest, requiredArchivePackageProps);
  const requiredKeysMatch =
    Object.keys(reqGiven).toString() === requiredArchivePackageProps.toString();
  if (!requiredKeysMatch) {
    const list = requiredArchivePackageProps.join(', ');
    throw new PackageInvalidArchiveError(
      `Invalid top-level package manifest: one or more fields missing of ${list}`
    );
  }

  // at least have all required properties
  // get optional values and combine into one object for the remaining operations
  const optGiven = pick(manifest, optionalArchivePackageProps);
  if (optGiven.elasticsearch) {
    optGiven.elasticsearch = parseTopLevelElasticsearchEntry(optGiven.elasticsearch);
  }
  const parsed: ArchivePackage = { ...reqGiven, ...optGiven };

  // Package name and version from the manifest must match those from the toplevel directory
  const pkgKey = pkgToPkgKey({ name: parsed.name, version: parsed.version });
  if (!topLevelDirOverride && toplevelDir !== pkgKey) {
    throw new PackageInvalidArchiveError(
      `Name ${parsed.name} and version ${parsed.version} do not match top-level directory ${toplevelDir}`
    );
  }

  const parsedDataStreams = parseAndVerifyDataStreams({
    paths,
    pkgName: parsed.name,
    pkgVersion: parsed.version,
    pkgBasePathOverride: topLevelDirOverride,
    manifests,
  });

  if (parsedDataStreams.length) {
    parsed.data_streams = parsedDataStreams;
  }

  parsed.policy_templates = parseAndVerifyPolicyTemplates(manifest);

  // add readme if exists
  const readme = parseAndVerifyReadme(paths, parsed.name, parsed.version);
  if (readme) {
    parsed.readme = readme;
  }

  // If no `release` is specified, fall back to a value based on the `version` of the integration
  // to maintain backwards comptability. This is a temporary measure until the `release` field is
  // completely deprecated elsewhere in Fleet/Agent. See https://github.com/elastic/package-spec/issues/225
  if (!parsed.release) {
    parsed.release =
      semverPrerelease(parsed.version) || semverMajor(parsed.version) < 1 ? 'beta' : 'ga';
  }

  // Ensure top-level variables are parsed as well
  if (manifest.vars) {
    parsed.vars = parseAndVerifyVars(manifest.vars, 'manifest.yml');
  }

  return parsed;
}

function parseAndVerifyReadme(paths: string[], pkgName: string, pkgVersion: string): string | null {
  const readmeRelPath = `/docs/README.md`;
  const readmePath = `${pkgName}-${pkgVersion}${readmeRelPath}`;
  return paths.includes(readmePath) ? `/package/${pkgName}/${pkgVersion}${readmeRelPath}` : null;
}

export function parseAndVerifyDataStreams(opts: {
  paths: string[];
  pkgName: string;
  pkgVersion: string;
  manifests: ManifestMap;
  pkgBasePathOverride?: string;
}): RegistryDataStream[] {
  const { paths, pkgName, pkgVersion, manifests, pkgBasePathOverride } = opts;
  // A data stream is made up of a subdirectory of name-version/data_stream/, containing a manifest.yml
  const dataStreamPaths = new Set<string>();
  const dataStreams: RegistryDataStream[] = [];
  const pkgBasePath = pkgBasePathOverride || pkgToPkgKey({ name: pkgName, version: pkgVersion });
  const dataStreamsBasePath = path.posix.join(pkgBasePath, 'data_stream');
  // pick all paths matching name-version/data_stream/DATASTREAM_NAME/...
  // from those, pick all unique data stream names
  paths.forEach((filePath) => {
    if (!filePath.startsWith(dataStreamsBasePath)) return;

    const streamWithoutPrefix = filePath.slice(dataStreamsBasePath.length);
    const [dataStreamPath] = streamWithoutPrefix.split('/').filter((v) => v); // remove undefined incase of leading /
    if (dataStreamPath) dataStreamPaths.add(dataStreamPath);
  });

  dataStreamPaths.forEach((dataStreamPath) => {
    const fullDataStreamPath = path.posix.join(dataStreamsBasePath, dataStreamPath);
    const manifestFile = path.posix.join(fullDataStreamPath, MANIFEST_NAME);
    const manifestBuffer = manifests[manifestFile];
    if (!paths.includes(manifestFile) || !manifestBuffer) {
      throw new PackageInvalidArchiveError(
        `No manifest.yml file found for data stream '${dataStreamPath}'`
      );
    }

    let manifest;
    try {
      manifest = yaml.safeLoad(manifestBuffer.toString());
    } catch (error) {
      throw new PackageInvalidArchiveError(
        `Could not parse package manifest for data stream '${dataStreamPath}': ${error}.`
      );
    }

    const {
      title: dataStreamTitle,
      release = DEFAULT_RELEASE_VALUE,
      type,
      dataset,
      streams: manifestStreams,
      elasticsearch,
      ...restOfProps
    } = manifest;

    if (!(dataStreamTitle && type)) {
      throw new PackageInvalidArchiveError(
        `Invalid manifest for data stream '${dataStreamPath}': one or more fields missing of 'title', 'type'`
      );
    }

    const ingestPipeline = parseDefaultIngestPipeline(fullDataStreamPath, paths);
    const streams = parseAndVerifyStreams(manifestStreams, dataStreamPath);
    const parsedElasticsearchEntry = parseDataStreamElasticsearchEntry(
      elasticsearch,
      ingestPipeline
    );

    // Build up the stream object here so we can conditionally insert nullable fields. The package registry omits undefined
    // fields, so we're mimicking that behavior here.
    const dataStreamObject: RegistryDataStream = {
      title: dataStreamTitle,
      release,
      type,
      package: pkgName,
      dataset: dataset || `${pkgName}.${dataStreamPath}`,
      path: dataStreamPath,
      elasticsearch: parsedElasticsearchEntry,
    };

    if (ingestPipeline) {
      dataStreamObject.ingest_pipeline = ingestPipeline;
    }

    if (streams.length) {
      dataStreamObject.streams = streams;
    }

    dataStreams.push(
      Object.entries(restOfProps).reduce((validatedDataStream, [key, value]) => {
        if (registryDataStreamProps.includes(key as RegistryDataStreamKeys)) {
          validatedDataStream[key] = value;
        }
        return validatedDataStream;
      }, dataStreamObject)
    );
  });

  return dataStreams;
}

export function parseAndVerifyStreams(
  manifestStreams: any,
  dataStreamPath: string
): RegistryStream[] {
  const streams: RegistryStream[] = [];
  if (manifestStreams && manifestStreams.length > 0) {
    manifestStreams.forEach((manifestStream: any) => {
      const {
        input,
        title: streamTitle,
        vars: manifestVars,
        template_path: templatePath,
        ...restOfProps
      } = manifestStream;
      if (!(input && streamTitle)) {
        throw new PackageInvalidArchiveError(
          `Invalid manifest for data stream ${dataStreamPath}: stream is missing one or more fields of: input, title`
        );
      }

      const vars = parseAndVerifyVars(manifestVars, `data stream ${dataStreamPath}`);

      const streamObject: RegistryStream = {
        input,
        title: streamTitle,
        template_path: templatePath || 'stream.yml.hbs',
      };

      if (vars.length) {
        streamObject.vars = vars;
      }

      streams.push(
        Object.entries(restOfProps).reduce((validatedStream, [key, value]) => {
          if (registryStreamProps.includes(key as RegistryStreamKeys)) {
            // @ts-expect-error
            validatedStream[key] = value;
          }
          return validatedStream;
        }, streamObject)
      );
    });
  }
  return streams;
}

export function parseAndVerifyVars(manifestVars: any[], location: string): RegistryVarsEntry[] {
  const vars: RegistryVarsEntry[] = [];
  if (manifestVars && manifestVars.length > 0) {
    manifestVars.forEach((manifestVar) => {
      const { name, type, ...restOfProps } = manifestVar;
      if (!(name && type)) {
        throw new PackageInvalidArchiveError(
          `Invalid var definition for ${location}: one of mandatory fields 'name' and 'type' missing in var: ${manifestVar}`
        );
      }

      vars.push(
        Object.entries(restOfProps).reduce(
          (validatedVarEntry, [key, value]) => {
            if (registryVarsProps.includes(key as RegistryVarsEntryKeys)) {
              // @ts-expect-error
              validatedVarEntry[key] = value;
            }
            return validatedVarEntry;
          },
          { name, type } as RegistryVarsEntry
        )
      );
    });
  }
  return vars;
}

export function parseAndVerifyPolicyTemplates(
  manifest: PackageSpecManifest
): RegistryPolicyTemplate[] {
  const policyTemplates: RegistryPolicyTemplate[] = [];
  const manifestPolicyTemplates = manifest.policy_templates;
  if (manifestPolicyTemplates && manifestPolicyTemplates.length > 0) {
    manifestPolicyTemplates.forEach((policyTemplate: any) => {
      const {
        name,
        title: policyTemplateTitle,
        description,
        inputs,
        input,
        multiple,
        ...restOfProps
      } = policyTemplate;
      if (!(name && policyTemplateTitle && description)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'name', 'title', 'description' is missing in policy template: ${policyTemplate}`
        );
      }
      let parsedInputs: RegistryInput[] | undefined = [];
      if (inputs) {
        parsedInputs = parseAndVerifyInputs(inputs, `config template ${name}`);
      }

      // defaults to true if undefined, but may be explicitly set to false.
      let parsedMultiple = true;
      if (typeof multiple === 'boolean' && multiple === false) parsedMultiple = false;

      policyTemplates.push(
        Object.entries(restOfProps).reduce(
          (validatedPolicyTemplate, [key, value]) => {
            if (registryPolicyTemplateProps.includes(key as RegistryPolicyTemplateKeys)) {
              // @ts-expect-error
              validatedPolicyTemplate[key] = value;
            }
            return validatedPolicyTemplate;
          },
          {
            name,
            title: policyTemplateTitle,
            description,
            multiple: parsedMultiple,
            // template can only have one of input or inputs
            ...(!input ? { inputs: parsedInputs } : { input }),
          } as RegistryPolicyTemplate
        )
      );
    });
  }
  return policyTemplates;
}

export function parseAndVerifyInputs(manifestInputs: any, location: string): RegistryInput[] {
  const inputs: RegistryInput[] = [];
  if (manifestInputs && manifestInputs.length > 0) {
    manifestInputs.forEach((input: any) => {
      const { title: inputTitle, vars, ...restOfProps } = input;
      if (!(input.type && inputTitle)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'type', 'title' missing in input: ${input}`
        );
      }
      const parsedVars = parseAndVerifyVars(vars, location);

      inputs.push(
        Object.entries(restOfProps).reduce(
          (validatedInput, [key, value]) => {
            if (registryInputProps.includes(key as RegistryInputKeys)) {
              // @ts-expect-error
              validatedInput[key] = value;
            }
            return validatedInput;
          },
          {
            title: inputTitle,
            vars: parsedVars,
          } as RegistryInput
        )
      );
    });
  }
  return inputs;
}

export function parseDataStreamElasticsearchEntry(
  elasticsearch?: Record<string, any>,
  ingestPipeline?: string
) {
  const parsedElasticsearchEntry: Record<string, any> = {};
  const expandedElasticsearch = expandDottedObject(elasticsearch);
  if (ingestPipeline) {
    parsedElasticsearchEntry['ingest_pipeline.name'] = ingestPipeline;
  }

  if (expandedElasticsearch?.privileges) {
    parsedElasticsearchEntry.privileges = expandedElasticsearch.privileges;
  }

  if (expandedElasticsearch?.source_mode) {
    parsedElasticsearchEntry.source_mode = expandedElasticsearch.source_mode;
  }

  if (expandedElasticsearch?.index_template?.mappings) {
    parsedElasticsearchEntry['index_template.mappings'] = expandDottedEntries(
      expandedElasticsearch.index_template.mappings
    );
  }

  if (expandedElasticsearch?.index_template?.settings) {
    parsedElasticsearchEntry['index_template.settings'] = expandDottedEntries(
      expandedElasticsearch.index_template.settings
    );
  }

  if (expandedElasticsearch?.index_mode) {
    parsedElasticsearchEntry.index_mode = expandedElasticsearch.index_mode;
  }

  return parsedElasticsearchEntry;
}

export function parseTopLevelElasticsearchEntry(elasticsearch?: Record<string, any>) {
  const parsedElasticsearchEntry: Record<string, any> = {};
  const expandedElasticsearch = expandDottedObject(elasticsearch);

  if (expandedElasticsearch?.privileges) {
    parsedElasticsearchEntry.privileges = expandedElasticsearch.privileges;
  }

  if (expandedElasticsearch?.index_template?.mappings) {
    parsedElasticsearchEntry['index_template.mappings'] = expandDottedEntries(
      expandedElasticsearch.index_template.mappings
    );
  }

  if (expandedElasticsearch?.index_template?.settings) {
    parsedElasticsearchEntry['index_template.settings'] = expandDottedEntries(
      expandedElasticsearch.index_template.settings
    );
  }
  return parsedElasticsearchEntry;
}

const isDefaultPipelineFile = (pipelinePath: string) =>
  pipelinePath.endsWith(DEFAULT_INGEST_PIPELINE_FILE_NAME_YML) ||
  pipelinePath.endsWith(DEFAULT_INGEST_PIPELINE_FILE_NAME_JSON);

export function parseDefaultIngestPipeline(fullDataStreamPath: string, paths: string[]) {
  const ingestPipelineDirPath = path.posix.join(
    fullDataStreamPath,
    '/elasticsearch/ingest_pipeline'
  );
  const defaultIngestPipelinePaths = paths.filter(
    (pipelinePath) =>
      pipelinePath.startsWith(ingestPipelineDirPath) && isDefaultPipelineFile(pipelinePath)
  );

  if (!defaultIngestPipelinePaths.length) return undefined;

  return DEFAULT_INGEST_PIPELINE_VALUE;
}
