import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { SLO } from '../../types/models';

export interface SloRepository {
  save(slo: SLO): Promise<SLO>;
  findById(id: string): Promise<SLO>;
}

export class KibanaSavedObjectsSloRepository implements SloRepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(slo: SLO): Promise<SLO> {
    await this.soClient.create<SLO>('slo', slo);
    return slo;
  }

  async findById(id: string): Promise<SLO> {
    const slo = await this.soClient.get<SLO>('slo', id);
    return slo.attributes;
  }
}
