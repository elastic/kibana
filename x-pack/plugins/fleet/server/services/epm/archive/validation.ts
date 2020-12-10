/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { pick, uniq } from 'lodash';
import {
  ArchivePackage,
  RegistryPolicyTemplate,
  RegistryDataStream,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../common/types';
import { PackageInvalidArchiveError } from '../../../errors';
import { unpackBufferEntries } from './index';
import { pkgToPkgKey } from '../registry';

const MANIFESTS: Record<string, Buffer> = {};
const MANIFEST_NAME = 'manifest.yml';

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
  'release',
  'owner',
] as const;

const optionalArchivePackageProps: readonly OptionalPackageProp[] = [
  'readme',
  'assets',
  'data_streams',
  'internal',
  'license',
  'type',
  'categories',
  'conditions',
  'screenshots',
  'icons',
  'policy_templates',
] as const;

// TODO: everything below performs verification of manifest.yml files, and hence duplicates functionality already implemented in the
// package registry. At some point this should probably be replaced (or enhanced) with verification based on
// https://github.com/elastic/package-spec/
export async function parseAndVerifyArchiveBuffer(
  archiveBuffer: Buffer,
  contentType: string
): Promise<{ paths: string[]; packageInfo: ArchivePackage }> {
  const entries = await unpackBufferEntries(archiveBuffer, contentType);
  const paths: string[] = [];
  entries.forEach(({ path, buffer }) => {
    paths.push(path);
    if (path.endsWith(MANIFEST_NAME) && buffer) MANIFESTS[path] = buffer;
  });

  return {
    packageInfo: parseAndVerifyArchive(paths),
    paths,
  };
}

function parseAndVerifyArchive(paths: string[]): ArchivePackage {
  // The top-level directory must match pkgName-pkgVersion, and no other top-level files or directories may be present
  const toplevelDir = paths[0].split('/')[0];
  paths.forEach((path) => {
    if (path.split('/')[0] !== toplevelDir) {
      throw new PackageInvalidArchiveError('Package contains more than one top-level directory.');
    }
  });

  // The package must contain a manifest file ...
  const manifestFile = `${toplevelDir}/${MANIFEST_NAME}`;
  const manifestBuffer = MANIFESTS[manifestFile];
  if (!paths.includes(manifestFile) || !manifestBuffer) {
    throw new PackageInvalidArchiveError(`Package must contain a top-level ${MANIFEST_NAME} file.`);
  }

  // ... which must be valid YAML
  let manifest: ArchivePackage;
  try {
    manifest = yaml.load(manifestBuffer.toString());
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
  const parsed: ArchivePackage = { ...reqGiven, ...optGiven };

  // Package name and version from the manifest must match those from the toplevel directory
  const pkgKey = pkgToPkgKey({ name: parsed.name, version: parsed.version });
  if (toplevelDir !== pkgKey) {
    throw new PackageInvalidArchiveError(
      `Name ${parsed.name} and version ${parsed.version} do not match top-level directory ${toplevelDir}`
    );
  }

  parsed.data_streams = parseAndVerifyDataStreams(paths, parsed.name, parsed.version);
  parsed.policy_templates = parseAndVerifyPolicyTemplates(manifest);
  // add readme if exists
  const readme = parseAndVerifyReadme(paths, parsed.name, parsed.version);
  if (readme) {
    parsed.readme = readme;
  }

  return parsed;
}
function parseAndVerifyReadme(paths: string[], pkgName: string, pkgVersion: string): string | null {
  const readmeRelPath = `/docs/README.md`;
  const readmePath = `${pkgName}-${pkgVersion}${readmeRelPath}`;
  return paths.includes(readmePath) ? `/package/${pkgName}/${pkgVersion}${readmeRelPath}` : null;
}
function parseAndVerifyDataStreams(
  paths: string[],
  pkgName: string,
  pkgVersion: string
): RegistryDataStream[] {
  // A data stream is made up of a subdirectory of name-version/data_stream/, containing a manifest.yml
  let dataStreamPaths: string[] = [];
  const dataStreams: RegistryDataStream[] = [];
  const pkgKey = pkgToPkgKey({ name: pkgName, version: pkgVersion });

  // pick all paths matching name-version/data_stream/DATASTREAM_PATH/...
  // from those, pick all unique data stream paths
  paths
    .filter((path) => path.startsWith(`${pkgKey}/data_stream/`))
    .forEach((path) => {
      const parts = path.split('/');
      if (parts.length > 2 && parts[2]) dataStreamPaths.push(parts[2]);
    });

  dataStreamPaths = uniq(dataStreamPaths);

  dataStreamPaths.forEach((dataStreamPath) => {
    const manifestFile = `${pkgKey}/data_stream/${dataStreamPath}/${MANIFEST_NAME}`;
    const manifestBuffer = MANIFESTS[manifestFile];
    if (!paths.includes(manifestFile) || !manifestBuffer) {
      throw new PackageInvalidArchiveError(
        `No manifest.yml file found for data stream '${dataStreamPath}'`
      );
    }

    let manifest;
    try {
      manifest = yaml.load(manifestBuffer.toString());
    } catch (error) {
      throw new PackageInvalidArchiveError(
        `Could not parse package manifest for data stream '${dataStreamPath}': ${error}.`
      );
    }

    const {
      title: dataStreamTitle,
      release,
      ingest_pipeline: ingestPipeline,
      type,
      dataset,
    } = manifest;
    if (!(dataStreamTitle && release && type)) {
      throw new PackageInvalidArchiveError(
        `Invalid manifest for data stream '${dataStreamPath}': one or more fields missing of 'title', 'release', 'type'`
      );
    }
    const streams = parseAndVerifyStreams(manifest, dataStreamPath);

    // default ingest pipeline name see https://github.com/elastic/package-registry/blob/master/util/dataset.go#L26
    return dataStreams.push({
      dataset: dataset || `${pkgName}.${dataStreamPath}`,
      title: dataStreamTitle,
      release,
      package: pkgName,
      ingest_pipeline: ingestPipeline || 'default',
      path: dataStreamPath,
      type,
      streams,
    });
  });

  return dataStreams;
}
function parseAndVerifyStreams(manifest: any, dataStreamPath: string): RegistryStream[] {
  const streams: RegistryStream[] = [];
  const manifestStreams = manifest.streams;
  if (manifestStreams && manifestStreams.length > 0) {
    manifestStreams.forEach((manifestStream: any) => {
      const {
        input,
        title: streamTitle,
        description,
        enabled,
        vars: manifestVars,
        template_path: templatePath,
      } = manifestStream;
      if (!(input && streamTitle)) {
        throw new PackageInvalidArchiveError(
          `Invalid manifest for data stream ${dataStreamPath}: stream is missing one or more fields of: input, title`
        );
      }
      const vars = parseAndVerifyVars(manifestVars, `data stream ${dataStreamPath}`);
      // default template path name see https://github.com/elastic/package-registry/blob/master/util/dataset.go#L143
      streams.push({
        input,
        title: streamTitle,
        description,
        enabled,
        vars,
        template_path: templatePath || 'stream.yml.hbs',
      });
    });
  }
  return streams;
}
function parseAndVerifyVars(manifestVars: any[], location: string): RegistryVarsEntry[] {
  const vars: RegistryVarsEntry[] = [];
  if (manifestVars && manifestVars.length > 0) {
    manifestVars.forEach((manifestVar) => {
      const {
        name,
        title: varTitle,
        description,
        type,
        required,
        show_user: showUser,
        multi,
        def,
        os,
      } = manifestVar;
      if (!(name && type)) {
        throw new PackageInvalidArchiveError(
          `Invalid var definition for ${location}: one of mandatory fields 'name' and 'type' missing in var: ${manifestVar}`
        );
      }
      vars.push({
        name,
        title: varTitle,
        description,
        type,
        required,
        show_user: showUser,
        multi,
        default: def,
        os,
      });
    });
  }
  return vars;
}
function parseAndVerifyPolicyTemplates(manifest: any): RegistryPolicyTemplate[] {
  const policyTemplates: RegistryPolicyTemplate[] = [];
  const manifestPolicyTemplates = manifest.policy_templates;
  if (manifestPolicyTemplates && manifestPolicyTemplates > 0) {
    manifestPolicyTemplates.forEach((policyTemplate: any) => {
      const { name, title: policyTemplateTitle, description, inputs, multiple } = policyTemplate;
      if (!(name && policyTemplateTitle && description && inputs)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'name', 'title', 'description', 'input' missing in policy template: ${policyTemplate}`
        );
      }

      const parsedInputs = parseAndVerifyInputs(inputs, `config template ${name}`);

      // defaults to true if undefined, but may be explicitly set to false.
      let parsedMultiple = true;
      if (typeof multiple === 'boolean' && multiple === false) parsedMultiple = false;

      policyTemplates.push({
        name,
        title: policyTemplateTitle,
        description,
        inputs: parsedInputs,
        multiple: parsedMultiple,
      });
    });
  }
  return policyTemplates;
}
function parseAndVerifyInputs(manifestInputs: any, location: string): RegistryInput[] {
  const inputs: RegistryInput[] = [];
  if (manifestInputs && manifestInputs.length > 0) {
    manifestInputs.forEach((input: any) => {
      const { type, title: inputTitle, description, vars } = input;
      if (!(type && inputTitle)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'type', 'title' missing in input: ${input}`
        );
      }
      const parsedVars = parseAndVerifyVars(vars, location);
      inputs.push({
        type,
        title: inputTitle,
        description,
        vars: parsedVars,
      });
    });
  }
  return inputs;
}
