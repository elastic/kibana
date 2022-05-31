/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import assert from 'assert';
import { FileKind } from '../../common';

export interface FileKindsRegistry {
  /**
   * Register a new file kind.
   */
  register(fileKind: FileKind): void;

  /**
   * Gets a {@link FileKind} or throws.
   */
  get(id: string): FileKind;

  /**
   * Return all registered {@link FileKind}s.
   */
  getAll(): FileKind[];
}

/**
 * @internal
 */
class FileKindsRegistryImpl implements FileKindsRegistry {
  private readonly fileKinds = new Map<string, FileKind>();

  register(fileKind: FileKind) {
    if (this.fileKinds.get(fileKind.id)) {
      throw new Error(`File kind "${fileKind.id}" already registered.`);
    }

    this.fileKinds.set(fileKind.id, fileKind);
  }

  get(id: string): FileKind {
    const fileKind = this.fileKinds.get(id);
    assert(fileKind, `File kind with id "${id}" not found.`);
    return fileKind;
  }

  getAll(): FileKind[] {
    return Array.from(this.fileKinds.values());
  }
}

export const fileKindsRegistry = new FileKindsRegistryImpl();
