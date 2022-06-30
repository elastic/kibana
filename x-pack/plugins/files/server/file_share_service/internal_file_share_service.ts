/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type {
  SavedObjectsClientContract,
  SavedObject,
  ISavedObjectsRepository,
} from '@kbn/core/server';
import {
  FileShareJSON,
  FileShareSavedObjectAttributes,
  UpdatableFileShareAttributes,
} from '../../common/types';
import type { File } from '../file';
import { fileShareObjectType } from '../saved_objects';
import { generateShareToken } from './generate_share_token';
import { FileShareServiceStart } from './types';

export interface CreateShareArgs {
  /**
   * Optionally provide a name for this file share instance
   */
  name?: string;
  /**
   * Optionally set an expiration date for this file share instance
   *
   * @note If not specified the file share will expire after 30 days
   */
  validUntil?: string;

  file: File;
}

export interface ListArgs {
  file: File;
  page?: number;
  perPage?: number;
}

interface TokenIdArg {
  tokenId: string;
}

export type DeleteArgs = TokenIdArg;
export type GetArgs = TokenIdArg;

export interface DeleteForFileArgs {
  file: File;
}

export interface UpdateArgs {
  id: string;
  attributes: UpdatableFileShareAttributes;
}

function toFileShareJSON(so: SavedObject<FileShareSavedObjectAttributes>): FileShareJSON {
  return {
    id: so.id,
    ...so.attributes,
  };
}

export class InternalFileShareService implements FileShareServiceStart {
  private readonly savedObjectsType = fileShareObjectType.name;

  constructor(
    private readonly savedObjects: SavedObjectsClientContract | ISavedObjectsRepository
  ) {}

  public async share({ file, name, validUntil }: CreateShareArgs): Promise<FileShareJSON> {
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
      { id: generateShareToken() }
    );

    return toFileShareJSON(so);
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
    return toFileShareJSON(result);
  }

  public async update(args: UpdateArgs): Promise<FileShareJSON> {
    const update = await this.savedObjects.update<FileShareSavedObjectAttributes>(
      this.savedObjectsType,
      args.id,
      args.attributes
    );
    return toFileShareJSON(update as SavedObject<FileShareSavedObjectAttributes>);
  }

  public async list({ file, page, perPage }: ListArgs): Promise<FileShareJSON[]> {
    const results = await this.savedObjects.find<FileShareSavedObjectAttributes>({
      type: this.savedObjectsType,
      perPage,
      page,
      filter: `${this.savedObjectsType}.attributes.file:${file.id}`,
    });

    return results.saved_objects.map(toFileShareJSON);
  }
}
