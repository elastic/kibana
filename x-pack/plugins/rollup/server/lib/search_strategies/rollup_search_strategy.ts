/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { keyBy, isString } from 'lodash';
import { ILegacyScopedClusterClient } from 'src/core/server';
import { ReqFacade } from '../../../../../../src/plugins/vis_type_timeseries/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../data_enhanced/server';
import { mergeCapabilitiesWithFields } from '../merge_capabilities_with_fields';
import { getCapabilitiesForRollupIndices } from '../map_capabilities';

const getRollupIndices = (rollupData: { [key: string]: any }) => Object.keys(rollupData);

const isIndexPatternContainsWildcard = (indexPattern: string) => indexPattern.includes('*');
const isIndexPatternValid = (indexPattern: string) =>
  indexPattern && isString(indexPattern) && !isIndexPatternContainsWildcard(indexPattern);

export const getRollupSearchStrategy = (
  AbstractSearchStrategy: any,
  RollupSearchCapabilities: any,
  getRollupService: (reg: ReqFacade) => Promise<ILegacyScopedClusterClient>
) =>
  class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';

    constructor() {
      super(ENHANCED_ES_SEARCH_STRATEGY, 'rollup', { rest_total_hits_as_int: true });
    }

    async search(req: ReqFacade, bodies: any[], options = {}) {
      const rollupService = await getRollupService(req);
      const requests: any[] = [];
      bodies.forEach((body) => {
        requests.push(
          rollupService.callAsCurrentUser('rollup.search', {
            ...body,
            rest_total_hits_as_int: true,
          })
        );
      });
      return Promise.all(requests);
    }

    async getRollupData(req: ReqFacade, indexPattern: string) {
      const rollupService = await getRollupService(req);
      return rollupService
        .callAsCurrentUser('rollup.rollupIndexCapabilities', {
          indexPattern,
        })
        .catch(() => Promise.resolve({}));
    }

    async checkForViability(req: ReqFacade, indexPattern: string) {
      let isViable = false;
      let capabilities = null;

      if (isIndexPatternValid(indexPattern)) {
        const rollupData = await this.getRollupData(req, indexPattern);
        const rollupIndices = getRollupIndices(rollupData);

        isViable = rollupIndices.length === 1;

        if (isViable) {
          const [rollupIndex] = rollupIndices;
          const fieldsCapabilities = getCapabilitiesForRollupIndices(rollupData);

          capabilities = new RollupSearchCapabilities(req, fieldsCapabilities, rollupIndex);
        }
      }

      return {
        isViable,
        capabilities,
      };
    }

    async getFieldsForWildcard(
      req: ReqFacade,
      indexPattern: string,
      {
        fieldsCapabilities,
        rollupIndex,
      }: { fieldsCapabilities: { [key: string]: any }; rollupIndex: string }
    ) {
      const fields = await super.getFieldsForWildcard(req, indexPattern);
      const fieldsFromFieldCapsApi = keyBy(fields, 'name');
      const rollupIndexCapabilities = fieldsCapabilities[rollupIndex].aggs;

      return mergeCapabilitiesWithFields(rollupIndexCapabilities, fieldsFromFieldCapsApi);
    }
  };
