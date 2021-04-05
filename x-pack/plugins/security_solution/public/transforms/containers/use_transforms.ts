/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import { ESQuery } from '../../../common/typed_json';
import {
  FactoryQueryTypes,
  HostsKpiQueries,
  HostsQueries,
  MatrixHistogramQuery,
  MatrixHistogramQuerySummary,
  MatrixHistogramType,
  NetworkKpiQueries,
  NetworkQueries,
} from '../../../common/search_strategy';
import { TransformConfigSchema } from '../../../common/transforms/types';
import { DEFAULT_TRANSFORMS } from '../../../common/constants';
import { useUiSetting$ } from '../../common/lib/kibana';

type TransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  filterQuery,
  histogramType,
}: {
  factoryQueryType: FactoryQueryTypes;
  indices: string[];
  filterQuery: ESQuery | string | undefined;
  histogramType?: MatrixHistogramType;
}) => {
  indices: string[];
  factoryQueryType: FactoryQueryTypes;
  histogramType?: MatrixHistogramType;
};

type GetTransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  filterQuery,
  histogramType,
}: {
  factoryQueryType: FactoryQueryTypes;
  indices: string[];
  transformSettings: TransformConfigSchema;
  filterQuery: ESQuery | string | undefined;
  histogramType?: MatrixHistogramType;
}) => {
  indices: string[];
  factoryQueryType: FactoryQueryTypes;
  histogramType?: MatrixHistogramType;
};

export interface ReturnTransform {
  getTransformChangesIfTheyExist: TransformChangesIfTheyExist;
}

export const useTransforms = (): ReturnTransform => {
  const [transformSettings] = useUiSetting$<TransformConfigSchema>(DEFAULT_TRANSFORMS);
  const [transforms, setTransforms] = useState<ReturnTransform>({
    getTransformChangesIfTheyExist: ({ factoryQueryType, indices, filterQuery, histogramType }) => {
      return getTransformChangesIfTheyExist({
        factoryQueryType,
        indices,
        filterQuery,
        transformSettings,
        histogramType,
      });
    },
  });

  useMemo(() => {
    const getTheTransformIndexForWidgetIfAvailable: TransformChangesIfTheyExist = ({
      factoryQueryType,
      indices,
      filterQuery,
      histogramType,
    }) => {
      return getTransformChangesIfTheyExist({
        factoryQueryType,
        indices,
        transformSettings,
        filterQuery,
        histogramType,
      });
    };
    setTransforms({
      getTransformChangesIfTheyExist: getTheTransformIndexForWidgetIfAvailable,
    });
  }, [transformSettings]);

  return { ...transforms };
};

export const getSettingsMatch = ({
  indices,
  transformSettings,
}: {
  indices: string[];
  transformSettings: TransformConfigSchema;
}) => {
  const removeAllSubtractedIndices = indices.filter((index) => !index.startsWith('-')).sort();
  return transformSettings.settings.find((setting) => {
    const match = setting.data_sources.some((dataSource) => {
      return dataSource.sort().join() === removeAllSubtractedIndices.join();
    });
    if (match) {
      return setting;
    } else {
      return undefined;
    }
  });
};

/**
 * TODO: Once this is moved into the plugin then this should use the
 * ELASTIC_NAME from '../../../common
 */
const ELASTIC_NAME = 'elastic';
const MODULE_NAME = 'security_solutions';

export const createIndicesFromPrefix = ({
  transformIndices,
  prefix,
}: {
  transformIndices: string[];
  prefix: string;
}): string[] => {
  return transformIndices.map((index) => `.${ELASTIC_NAME}_${prefix}_${MODULE_NAME}_${index}`);
};

export const isFilterQueryCompatible = (filterQuery: ESQuery | string | undefined) => {
  if (filterQuery === undefined) {
    return true;
  } else if (typeof filterQuery === 'string') {
    return (
      filterQuery === '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}'
    );
  } else {
    // TODO: Can we check here and return if it matches a string or other signature?
    return false;
  }
};

// TODO: Add the other switches here such as the disabling of a widget/factory type
// or if a transform is disabled, then this cannot use the query
export const getTransformChangesIfTheyExist: GetTransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  transformSettings,
  filterQuery,
  histogramType,
}) => {
  if (!transformSettings.enabled) {
    // Early return if we are not enabled
    return { factoryQueryType, indices };
  }

  if (!isFilterQueryCompatible(filterQuery)) {
    return { factoryQueryType, indices };
  }

  const settings = getSettingsMatch({ indices, transformSettings });
  if (settings == null) {
    // early return if none of the settings match
    return { factoryQueryType, indices };
  }

  switch (factoryQueryType) {
    case HostsKpiQueries.kpiHosts: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['host_entities'],
        }),
        factoryQueryType: HostsKpiQueries.kpiHostsSummary,
      };
    }
    case HostsKpiQueries.kpiAuthentications: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['user_entities'],
        }),
        factoryQueryType: HostsKpiQueries.kpiAuthenticationsSummary,
      };
    }
    case HostsKpiQueries.kpiUniqueIps: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['source_ip_entities', 'destination_ip_entities'],
        }),
        factoryQueryType: HostsKpiQueries.kpiUniqueIpsSummary,
      };
    }
    case HostsQueries.hosts: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['host_entities'],
        }),
        factoryQueryType: HostsQueries.hostsSummary,
      };
    }
    case HostsQueries.authentications: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['user_entities'],
        }),
        factoryQueryType: HostsQueries.authenticationsSummary,
      };
    }
    case NetworkQueries.topCountries: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['source_country_iso_code_entities', 'dest_country_iso_code_entities'],
        }),
        factoryQueryType: NetworkQueries.topCountriesSummary,
      };
    }
    case NetworkQueries.topNFlow: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['source_ip_entities', 'destination_ip_entities'],
        }),
        factoryQueryType: NetworkQueries.topNFlowSummary,
      };
    }
    case NetworkKpiQueries.dns: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['ip_histogram'],
        }),
        factoryQueryType: NetworkKpiQueries.dnsSummary,
      };
    }
    case NetworkKpiQueries.networkEvents: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['ip_histogram'],
        }),
        factoryQueryType: NetworkKpiQueries.networkEventsSummary,
      };
    }
    case NetworkKpiQueries.tlsHandshakes: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['ip_histogram'],
        }),
        factoryQueryType: NetworkKpiQueries.tlsHandshakesSummary,
      };
    }
    case NetworkKpiQueries.uniquePrivateIps: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['source_ip_entities', 'destination_ip_entities'],
        }),
        factoryQueryType: NetworkKpiQueries.uniquePrivateIpsSummary,
      };
    }
    case MatrixHistogramQuery: {
      switch (histogramType) {
        case MatrixHistogramType.authentications: {
          return {
            indices: createIndicesFromPrefix({
              prefix: settings.prefix,
              transformIndices: ['user_histogram'],
            }),
            factoryQueryType: MatrixHistogramQuerySummary,
            histogramType: MatrixHistogramType.authenticationsSummary,
          };
        }
        default: {
          return { factoryQueryType, indices };
        }
      }
    }
    default: {
      return { factoryQueryType, indices };
    }
  }
};
