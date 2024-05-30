/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file is created to ensure all file operations are using proper async promises throughout the plugin.
import { readdir, writeFile, mkdir, stat, readFile, cp } from 'fs/promises';
import { dirname } from 'path';

export async function asyncExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    } else {
      throw error;
    }
  }
}

export async function asyncEnsureDir(dirPath: string): Promise<void> {
  const exists = await asyncExists(dirPath);
  if (!exists) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function asyncCreate(path: string, content: string | Buffer): Promise<void> {
  return await writeFile(path, content, { encoding: 'utf-8' });
}

export async function asyncCopy(source: string, destination: string): Promise<void> {
  try {
    // Ensure the destination directory exists
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function asyncListDir(path: string): Promise<string[]> {
  return await readdir(path);
}

export async function asyncRead(path: string): Promise<string> {
  return await readFile(path, { encoding: 'utf-8' });
}
