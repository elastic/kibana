/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { SavedObjectsClientContract, SavedObjectsServiceSetup } from '@kbn/core/server';
import { FileShareJSON, FileShareSavedObjectAttributes } from '../../common/types';
import type { File } from '../file';
import { fileShareObjectType } from '../saved_objects';
import { generateShareToken } from './generate_share_token';

interface CreateShareArgs {
  /**
   * Optionally provide a name for this file share instance
   */
  name?: string;
  /**
   * Optionally set an expiration date for this file share instance
   */
  validUntil?: string;

  file: File;
}

interface ListArgs {
  file: File;
  page?: number;
  perPage?: number;
}

interface TokenIdArg {
  tokenId: string;
}

type DeleteArgs = TokenIdArg;
type GetArgs = TokenIdArg;

interface DeleteForFileArgs {
  file: File;
}

export class FileShareService {
  private readonly savedObjectsType = fileShareObjectType.name;

  constructor(private readonly savedObjects: SavedObjectsClientContract) {}

  public async share({ file, name, validUntil }: CreateShareArgs): Promise<FileShareJSON> {
    const token = await generateShareToken();
    const so = await this.savedObjects.create<FileShareSavedObjectAttributes>(
      this.savedObjectsType,
      {
        file: file.id,
        created_at: new Date().toISOString(),
        name,
        valid_until: validUntil
          ? moment(validUntil).toISOString()
          : moment().add(30, 'days').toISOString(),
      },
      { id: token }
    );

    return {
      id: so.id,
      ...so.attributes,
    };
  }

  public async delete({ tokenId }: DeleteArgs): Promise<void> {
    await this.savedObjects.delete(this.savedObjectsType, tokenId);
  }

  public async deleteForFile({ file }: DeleteForFileArgs): Promise<void> {
    const result = await this.list({ file });
    await Promise.all(result.map(({ id }) => this.delete({ tokenId: id })));
  }

  public async get({ tokenId }: GetArgs): Promise<FileShareJSON> {
    const result = await this.savedObjects.get<FileShareSavedObjectAttributes>(
      this.savedObjectsType,
      tokenId
    );
    return {
      id: result.id,
      ...result.attributes,
    };
  }

  public async list({ file, page, perPage }: ListArgs): Promise<FileShareJSON[]> {
    const results = await this.savedObjects.find<FileShareSavedObjectAttributes>({
      type: this.savedObjectsType,
      perPage,
      page,
      filter: `file:${file.id}`,
    });

    return results.saved_objects.map(({ id, attributes }) => ({
      id,
      ...attributes,
    }));
  }

  public static async setup(savedObjects: SavedObjectsServiceSetup) {
    savedObjects.registerType(fileShareObjectType);
  }
}
