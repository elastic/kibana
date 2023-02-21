/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { homedir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

const DEFAULT_DIRECTORY_PATH = join(homedir(), '.kibanaSecuritySolutionCliTools');

interface SettingStorageOptions<TSettingsDef extends object = object> {
  /** The default directory where settings will be saved. Defaults to `.kibanaSecuritySolutionCliTools` */
  directory?: string;

  /** The default settings object (used if file does not exist yet) */
  defaultSettings?: TSettingsDef;
}

/**
 * A generic service for persisting settings. All settings are stored under a directory (configurable)
 * under the user's home directory. The default directory name is `.kibanaSecuritySolutionCliTools`
 */
export class SettingsStorage<TSettingsDef extends object = object> {
  private options: Required<SettingStorageOptions<TSettingsDef>>;
  private readonly settingsFileFullPath: string;
  private dirExists: boolean = false;

  constructor(fileName: string, options: SettingStorageOptions<TSettingsDef> = {}) {
    const { directory = DEFAULT_DIRECTORY_PATH, defaultSettings = {} as TSettingsDef } = options;

    this.options = {
      directory,
      defaultSettings,
    };

    this.settingsFileFullPath = join(this.options.directory, fileName);
  }

  /** The default directory path where setting files will be saved */
  static getDefaultDirectoryPath() {
    return DEFAULT_DIRECTORY_PATH;
  }

  protected async ensureExists(): Promise<void> {
    if (!this.dirExists) {
      await mkdir(this.options.directory, { recursive: true });
      this.dirExists = true;

      if (!existsSync(this.settingsFileFullPath)) {
        await this.save(this.options.defaultSettings);
      }
    }
  }

  /** Returns the directory path where the settings file is getting saved to */
  public getDirectoryPath(): string {
    return this.options.directory;
  }

  /** Retrieve the content of the settings file */
  public async get(): Promise<TSettingsDef> {
    await this.ensureExists();
    const fileContent = await readFile(this.settingsFileFullPath);
    return JSON.parse(fileContent.toString()) as TSettingsDef;
  }

  /** Save a new version of the settings to disk */
  public async save(newSettings: TSettingsDef): Promise<void> {
    // FIXME: Enhance this method so that Partial `newSettings` can be provided and they are merged into the existing set.
    await this.ensureExists();
    await writeFile(this.settingsFileFullPath, JSON.stringify(newSettings, null, 2));
  }

  /** Deletes the settings file from disk */
  public async delete(): Promise<void> {
    await this.ensureExists();
    await unlink(this.settingsFileFullPath);
  }
}
