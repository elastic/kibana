/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlowTargetSourceDest } from '../../../common/search_strategy';
import type { ExpandedDetailType } from '../../../common/types';
import { USER_LABEL, HOST_LABEL, IP_LABEL } from './constants';

interface DetailField {
  label: string;
  createExpandedDetail: (value: string) => ExpandedDetailType;
}

export const DETAILS_FIELDS: Record<string, DetailField> = {
  'user.name': {
    label: USER_LABEL,
    createExpandedDetail: (value) => ({
      panelView: 'userDetail',
      params: {
        userName: value,
      },
    }),
  },
  'host.name': {
    label: HOST_LABEL,
    createExpandedDetail: (value) => ({
      panelView: 'hostDetail',
      params: {
        hostName: value,
      },
    }),
  },
  'source.ip': {
    label: IP_LABEL,
    createExpandedDetail: (value) => ({
      panelView: 'networkDetail',
      params: {
        ip: value,
        flowTarget: FlowTargetSourceDest.source,
      },
    }),
  },
  'destination.ip': {
    label: IP_LABEL,
    createExpandedDetail: (value) => ({
      panelView: 'networkDetail',
      params: {
        ip: value,
        flowTarget: FlowTargetSourceDest.destination,
      },
    }),
  },
};
