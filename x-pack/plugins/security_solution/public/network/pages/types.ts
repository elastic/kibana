/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteComponentProps } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';
import { InputsModelId } from '../../common/store/inputs/constants';

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
}>;

export type NetworkComponentProps = Partial<RouteComponentProps<{}>> & {
  networkPagePath: string;
  hasMlUserPermissions: boolean;
  capabilitiesFetched: boolean;
};
