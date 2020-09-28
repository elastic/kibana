/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { uniq } from 'lodash';
import { title } from 'process';

import {
  ArchivePackage,
  Dataset,
  RegistryConfigTemplate,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../common/types';
import { PackageInvalidArchiveError, PackageUnsupportedMediaTypeError } from '../../../errors';
import { cacheGet, cacheSet, setArchiveFilelist } from '../registry/cache';
import { unzipBuffer, untarBuffer, ArchiveEntry } from '../registry/extract';

export async function loadArchivePackage({
  archiveBuffer,
  contentType,
}: {
  archiveBuffer: Buffer;
  contentType: string;
}): Promise<{ paths: string[]; archivePackageInfo: ArchivePackage }> {
  const paths = await unpackArchiveToCache(archiveBuffer, contentType);
  const archivePackageInfo = parseAndVerifyArchive(paths);
  setArchiveFilelist(archivePackageInfo.name, archivePackageInfo.version, paths);

  return {
    paths,
    archivePackageInfo,
  };
}

function getBufferExtractorForContentType(contentType: string) {
  if (contentType === 'application/gzip') {
    return untarBuffer;
  } else if (contentType === 'application/zip') {
    return unzipBuffer;
  } else {
    throw new PackageUnsupportedMediaTypeError(
      `Unsupported media type ${contentType}. Please use 'application/gzip' or 'application/zip'`
    );
  }
}

export async function unpackArchiveToCache(
  archiveBuffer: Buffer,
  contentType: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const bufferExtractor = getBufferExtractorForContentType(contentType);
  const paths: string[] = [];
  try {
    await bufferExtractor(archiveBuffer, filter, (entry: ArchiveEntry) => {
      const { path, buffer } = entry;
      // skip directories
      if (path.slice(-1) === '/') return;
      if (buffer) {
        cacheSet(path, buffer);
        paths.push(path);
      }
    });
  } catch (error) {
    throw new PackageInvalidArchiveError(
      `Error during extraction of uploaded package: ${error}. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }

  // While unpacking a tar.gz file with unzipBuffer() will result in a thrown error in the try-catch above,
  // unpacking a zip file with untarBuffer() just results in nothing.
  if (paths.length === 0) {
    throw new PackageInvalidArchiveError(
      `Uploaded archive seems empty. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
  return paths;
}

// TODO: everything below performs verification of manifest.yml files, and hence duplicates functionality already implemented in the
// package registry. At some point this should probably be replaced (or enhanced) with verification based on
// https://github.com/elastic/package-spec/

function parseAndVerifyArchive(paths: string[]): ArchivePackage {
  // The top-level directory must match pkgName-pkgVersion, and no other top-level files or directories may be present
  const toplevelDir = paths[0].split('/')[0];
  paths.forEach((path) => {
    if (path.split('/')[0] !== toplevelDir) {
      throw new PackageInvalidArchiveError('Package contains more than one top-level directory.');
    }
  });

  // The package must contain a manifest file ...
  const manifestFile = `${toplevelDir}/manifest.yml`;
  const manifestBuffer = cacheGet(manifestFile);
  if (!paths.includes(manifestFile) || !manifestBuffer) {
    throw new PackageInvalidArchiveError('Package must contain a top-level manifest.yml file.');
  }

  // ... which must be valid YAML
  let manifest;
  try {
    manifest = yaml.load(manifestBuffer.toString());
  } catch (error) {
    throw new PackageInvalidArchiveError(`Could not parse top-level package manifest: ${error}.`);
  }

  // Package name and version from the manifest must match those from the toplevel directory
  if (toplevelDir !== `${manifest.name}-${manifest.version}`) {
    throw new PackageInvalidArchiveError(
      `Name ${manifest.name} and version ${manifest.version} do not match top-level directory ${toplevelDir}`
    );
  }

  const { name, version, description, type, categories, format_version: formatVersion } = manifest;
  // check for mandatory fields
  if (!(name && version && description && type && categories && formatVersion)) {
    throw new PackageInvalidArchiveError(
      'Invalid top-level package manifest: one or more fields missing of name, version, description, type, categories, format_version'
    );
  }

  const datasets = parseAndVerifyDatasets(paths, name, version);
  const configTemplates = parseAndVerifyConfigTemplates(manifest);

  return {
    name,
    version,
    description,
    type,
    categories,
    format_version: formatVersion,
    datasets,
    config_templates: configTemplates,
  };
}

function parseAndVerifyDatasets(paths: string[], pkgName: string, pkgVersion: string): Dataset[] {
  // A dataset is made up of a subdirectory of name-version/dataset/, containing a manifest.yml
  let datasetPaths: string[] = [];
  const datasets: Dataset[] = [];

  // pick all paths matching name-version/dataset/DATASET_PATH/...
  // from those, pick all unique dataset paths
  paths
    .filter((path) => path.startsWith(`${pkgName}-${pkgVersion}/dataset/`))
    .forEach((path) => {
      const parts = path.split('/');
      if (parts.length > 2 && parts[2]) datasetPaths.push(parts[2]);
    });

  datasetPaths = uniq(datasetPaths);

  datasetPaths.forEach((datasetPath) => {
    const manifestFile = `${pkgName}-${pkgVersion}/dataset/${datasetPath}/manifest.yml`;
    const manifestBuffer = cacheGet(manifestFile);
    if (!paths.includes(manifestFile) || !manifestBuffer) {
      throw new PackageInvalidArchiveError(
        `No manifest.yml file found for dataset '${datasetPath}'`
      );
    }

    let manifest;
    try {
      manifest = yaml.load(manifestBuffer.toString());
    } catch (error) {
      throw new PackageInvalidArchiveError(
        `Could not parse package manifest for dataset '${datasetPath}': ${error}.`
      );
    }

    const { title: datasetTitle, release, ingest_pipeline: ingestPipeline, type } = manifest;
    if (!(datasetTitle && release && type)) {
      throw new PackageInvalidArchiveError(
        `Invalid manifest for dataset '${datasetPath}': one or more fields missing of 'title', 'release', 'type'`
      );
    }
    const streams = parseAndVerifyStreams(manifest, datasetPath);

    // default ingest pipeline name see https://github.com/elastic/package-registry/blob/master/util/dataset.go#L26
    return datasets.push({
      name: `${pkgName}.${datasetPath}`,
      title: datasetTitle,
      release,
      package: pkgName,
      ingest_pipeline: ingestPipeline || 'default',
      path: datasetPath,
      type,
      streams,
    });
  });

  return datasets;
}

function parseAndVerifyStreams(manifest: any, datasetPath: string): RegistryStream[] {
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
          `Invalid manifest for dataset ${datasetPath}: stream is missing one or more fields of: input, title`
        );
      }
      const vars = parseAndVerifyVars(manifestVars, `dataset ${datasetPath}`);
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

function parseAndVerifyConfigTemplates(manifest: any): RegistryConfigTemplate[] {
  const configTemplates: RegistryConfigTemplate[] = [];
  const manifestConfigTemplates = manifest.config_templates;
  if (manifestConfigTemplates && manifestConfigTemplates > 0) {
    manifestConfigTemplates.forEach((configTemplate: any) => {
      const { name, title: configTemplateTitle, description, inputs, multiple } = configTemplate;
      if (!(name && configTemplateTitle && description && inputs)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'name', 'title', 'description', 'input' missing in config template: ${configTemplate}`
        );
      }

      const parsedInputs = parseAndVerifyInputs(inputs, `config template ${name}`);

      // defaults to true if undefined, but may be explicitly set to false.
      let parsedMultiple = true;
      if (typeof multiple === 'boolean' && multiple === false) parsedMultiple = false;

      configTemplates.push({
        name,
        title: configTemplateTitle,
        description,
        inputs: parsedInputs,
        multiple: parsedMultiple,
      });
    });
  }
  return configTemplates;
}

function parseAndVerifyInputs(manifestInputs: any, location: string): RegistryInput[] {
  const inputs: RegistryInput[] = [];
  if (manifestInputs && manifestInputs.length > 0) {
    manifestInputs.forEach((input: any) => {
      const { type, title: inputTitle, description, vars } = input;
      if (!(type && inputTitle)) {
        throw new PackageInvalidArchiveError(
          `Invalid top-level manifest: one of mandatory fields 'name', 'title', 'description', 'input' missing in input: ${input}`
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
