/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalTimeArgs } from '../../common/containers/use_global_time';
import { UEBA_PATH } from '../../../common/constants';

export const hostDetailsPagePath = `${UEBA_PATH}/:detailName`;

// export type UebaTabsProps = GlobalTimeArgs & {
//   docValueFields: DocValueFields[];
//   filterQuery: string;
//   indexNames: string[];
//   type: hostsModel.HostsType;
//   setAbsoluteRangeDatePicker: ActionCreator<{
//     id: InputsModelId;
//     from: string;
//     to: string;
//   }>;
// };

export type HostsQueryProps = GlobalTimeArgs;
