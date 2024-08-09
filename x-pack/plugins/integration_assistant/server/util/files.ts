/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'fs';
import { dirname } from 'path';

export function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    } else {
      throw error;
    }
  }
}

export function ensureDirSync(dirPath: string): void {
  const exists = existsSync(dirPath);
  if (!exists) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function createSync(path: string, content: string | Buffer): void {
  writeFileSync(path, content, { encoding: 'utf-8' });
}

export function copySync(source: string, destination: string): void {
  // Ensure the destination directory exists
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

export function listDirSync(path: string): string[] {
  return readdirSync(path);
}

export function readSync(path: string): string {
  return readFileSync(path, { encoding: 'utf-8' });
}

export function removeDirSync(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
