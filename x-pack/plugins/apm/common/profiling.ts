/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  PROFILE_ALLOC_OBJECTS,
  PROFILE_ALLOC_SPACE,
  PROFILE_CPU_NS,
  PROFILE_INUSE_OBJECTS,
  PROFILE_INUSE_SPACE,
  PROFILE_SAMPLES_COUNT,
  PROFILE_WALL_US,
} from './elasticsearch_fieldnames';

export enum ProfilingValueType {
  wallTime = 'wall_time',
  cpuTime = 'cpu_time',
  samples = 'samples',
  allocObjects = 'alloc_objects',
  allocSpace = 'alloc_space',
  inuseObjects = 'inuse_objects',
  inuseSpace = 'inuse_space',
}

export enum ProfilingValueTypeUnit {
  ns = 'ns',
  us = 'us',
  count = 'count',
  bytes = 'bytes',
}

export interface ProfileNode {
  id: string;
  label: string;
  fqn: string;
  value: number;
  children: string[];
}

const config = {
  [ProfilingValueType.wallTime]: {
    unit: ProfilingValueTypeUnit.us,
    label: i18n.translate(
      'xpack.apm.serviceProfiling.valueTypeLabel.wallTime',
      {
        defaultMessage: 'Wall',
      }
    ),
    field: PROFILE_WALL_US,
  },
  [ProfilingValueType.cpuTime]: {
    unit: ProfilingValueTypeUnit.ns,
    label: i18n.translate('xpack.apm.serviceProfiling.valueTypeLabel.cpuTime', {
      defaultMessage: 'On-CPU',
    }),
    field: PROFILE_CPU_NS,
  },
  [ProfilingValueType.samples]: {
    unit: ProfilingValueTypeUnit.count,
    label: i18n.translate('xpack.apm.serviceProfiling.valueTypeLabel.samples', {
      defaultMessage: 'Samples',
    }),
    field: PROFILE_SAMPLES_COUNT,
  },
  [ProfilingValueType.allocObjects]: {
    unit: ProfilingValueTypeUnit.count,
    label: i18n.translate(
      'xpack.apm.serviceProfiling.valueTypeLabel.allocObjects',
      {
        defaultMessage: 'Alloc. objects',
      }
    ),
    field: PROFILE_ALLOC_OBJECTS,
  },
  [ProfilingValueType.allocSpace]: {
    unit: ProfilingValueTypeUnit.bytes,
    label: i18n.translate(
      'xpack.apm.serviceProfiling.valueTypeLabel.allocSpace',
      {
        defaultMessage: 'Alloc. space',
      }
    ),
    field: PROFILE_ALLOC_SPACE,
  },
  [ProfilingValueType.inuseObjects]: {
    unit: ProfilingValueTypeUnit.count,
    label: i18n.translate(
      'xpack.apm.serviceProfiling.valueTypeLabel.inuseObjects',
      {
        defaultMessage: 'In-use objects',
      }
    ),
    field: PROFILE_INUSE_OBJECTS,
  },
  [ProfilingValueType.inuseSpace]: {
    unit: ProfilingValueTypeUnit.bytes,
    label: i18n.translate(
      'xpack.apm.serviceProfiling.valueTypeLabel.inuseSpace',
      {
        defaultMessage: 'In-use space',
      }
    ),
    field: PROFILE_INUSE_SPACE,
  },
};

export const getValueTypeConfig = (type: ProfilingValueType) => {
  return config[type];
};
