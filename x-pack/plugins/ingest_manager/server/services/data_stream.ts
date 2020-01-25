/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { NewDataStream, DataStream, ListWithKuery } from '../types';

const SAVED_OBJECT_TYPE = 'data_streams';

class DataStreamService {
  public async create(
    soClient: SavedObjectsClientContract,
    dataStream: NewDataStream,
    options?: { id?: string }
  ): Promise<DataStream> {
    const newSo = await soClient.create<DataStream>(
      SAVED_OBJECT_TYPE,
      dataStream as DataStream,
      options
    );

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<DataStream | null> {
    const dataStreamSO = await soClient.get<DataStream>(SAVED_OBJECT_TYPE, id);
    if (!dataStreamSO) {
      return null;
    }

    if (dataStreamSO.error) {
      throw new Error(dataStreamSO.error.message);
    }

    return {
      id: dataStreamSO.id,
      ...dataStreamSO.attributes,
    };
  }

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<DataStream[] | null> {
    const dataStreamSO = await soClient.bulkGet<DataStream>(
      ids.map(id => ({
        id,
        type: SAVED_OBJECT_TYPE,
      }))
    );
    if (!dataStreamSO) {
      return null;
    }

    return dataStreamSO.saved_objects.map(so => ({
      id: so.id,
      ...so.attributes,
    }));
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<{ items: DataStream[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;

    const dataStreams = await soClient.find<DataStream>({
      type: SAVED_OBJECT_TYPE,
      page,
      perPage,
      // To ensure users don't need to know about SO data structure...
      filter: kuery
        ? kuery.replace(
            new RegExp(`${SAVED_OBJECT_TYPE}\.`, 'g'),
            `${SAVED_OBJECT_TYPE}.attributes.`
          )
        : undefined,
    });

    return {
      items: dataStreams.saved_objects.map<DataStream>(dataStreamSO => {
        return {
          id: dataStreamSO.id,
          ...dataStreamSO.attributes,
        };
      }),
      total: dataStreams.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    dataStream: NewDataStream
  ): Promise<DataStream> {
    await soClient.update<DataStream>(SAVED_OBJECT_TYPE, id, dataStream);
    return (await this.get(soClient, id)) as DataStream;
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(SAVED_OBJECT_TYPE, id);
  }
}

export const dataStreamService = new DataStreamService();
