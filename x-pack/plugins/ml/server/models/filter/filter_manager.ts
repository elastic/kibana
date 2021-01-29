/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import type { MlClient } from '../../lib/ml_client';

import { DetectorRule, DetectorRuleScope } from '../../../common/types/detector_rules';

export interface Filter {
  filter_id: string;
  description?: string;
  items: string[];
}

export interface FormFilter {
  filterId: string;
  description?: string;
  addItems?: string[];
  removeItems?: string[];
}

export interface FilterRequest {
  filter_id: string;
  description?: string;
  add_items?: string[];
  remove_items?: string[];
}

interface FilterUsage {
  jobs: string[];
  detectors: string[];
}

interface FilterStats {
  filter_id: string;
  description?: string;
  item_count: number;
  used_by: FilterUsage;
}

interface FiltersInUse {
  [id: string]: FilterUsage;
}

interface PartialDetector {
  detector_description: string;
  custom_rules: DetectorRule[];
}

interface PartialJob {
  job_id: string;
  analysis_config: {
    detectors: PartialDetector[];
  };
}

export class FilterManager {
  constructor(private _mlClient: MlClient) {}

  async getFilter(filterId: string) {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this._mlClient.getJobs(),
        this._mlClient.getFilters({ filter_id: filterId }),
      ]);

      if (results[FILTERS] && results[FILTERS].body.filters.length) {
        let filtersInUse: FiltersInUse = {};
        if (results[JOBS] && results[JOBS].body.jobs) {
          filtersInUse = this.buildFiltersInUse(results[JOBS].body.jobs);
        }

        const filter = results[FILTERS].body.filters[0];
        filter.used_by = filtersInUse[filter.filter_id];
        return filter;
      } else {
        throw Boom.notFound(`Filter with the id "${filterId}" not found`);
      }
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilters() {
    try {
      const { body } = await this._mlClient.getFilters({ size: 1000 });
      return body.filters;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilterStats() {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this._mlClient.getJobs(),
        this._mlClient.getFilters({ size: 1000 }),
      ]);

      // Build a map of filter_ids against jobs and detectors using that filter.
      let filtersInUse: FiltersInUse = {};
      if (results[JOBS] && results[JOBS].body.jobs) {
        filtersInUse = this.buildFiltersInUse(results[JOBS].body.jobs);
      }

      // For each filter, return just
      //  filter_id
      //  description
      //  item_count
      //  jobs using the filter
      const filterStats: FilterStats[] = [];
      if (results[FILTERS] && results[FILTERS].body.filters) {
        results[FILTERS].body.filters.forEach((filter: Filter) => {
          const stats: FilterStats = {
            filter_id: filter.filter_id,
            description: filter.description,
            item_count: filter.items.length,
            used_by: filtersInUse[filter.filter_id],
          };
          filterStats.push(stats);
        });
      }

      return filterStats;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async newFilter(filter: FormFilter) {
    const { filterId, ...body } = filter;
    try {
      // Returns the newly created filter.
      const { body: resp } = await this._mlClient.putFilter({ filter_id: filterId, body });
      return resp;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async updateFilter(filterId: string, filter: FormFilter) {
    try {
      const body: FilterRequest = { filter_id: filterId };
      if (filter.description !== undefined) {
        body.description = filter.description;
      }
      if (filter.addItems !== undefined) {
        body.add_items = filter.addItems;
      }
      if (filter.removeItems !== undefined) {
        body.remove_items = filter.removeItems;
      }

      // Returns the newly updated filter.
      const { body: resp } = await this._mlClient.updateFilter({
        filter_id: filterId,
        body,
      });
      return resp;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async deleteFilter(filterId: string) {
    const { body } = await this._mlClient.deleteFilter({ filter_id: filterId });
    return body;
  }

  buildFiltersInUse(jobsList: PartialJob[]) {
    // Build a map of filter_ids against jobs and detectors using that filter.
    const filtersInUse: FiltersInUse = {};
    jobsList.forEach((job) => {
      const detectors = job.analysis_config.detectors;
      detectors.forEach((detector) => {
        if (detector.custom_rules) {
          const rules = detector.custom_rules;
          rules.forEach((rule) => {
            if (rule.scope) {
              const ruleScope: DetectorRuleScope = rule.scope;
              const scopeFields = Object.keys(ruleScope);
              scopeFields.forEach((scopeField) => {
                const filter = ruleScope[scopeField];
                const filterId = filter.filter_id;
                if (filtersInUse[filterId] === undefined) {
                  filtersInUse[filterId] = { jobs: [], detectors: [] };
                }

                const jobs = filtersInUse[filterId].jobs;
                const dtrs = filtersInUse[filterId].detectors;
                const jobId = job.job_id;

                // Label the detector with the job it comes from.
                const detectorLabel = `${detector.detector_description} (${jobId})`;
                if (jobs.indexOf(jobId) === -1) {
                  jobs.push(jobId);
                }

                if (dtrs.indexOf(detectorLabel) === -1) {
                  dtrs.push(detectorLabel);
                }
              });
            }
          });
        }
      });
    });

    return filtersInUse;
  }
}
