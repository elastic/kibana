/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';

import { Case } from '../../containers/types';
import * as i18n from './translations';

interface GetActions {
  deleteCaseOnClick: (deleteCase: Case) => void;
}

export const getActions = ({
  deleteCaseOnClick,
}: GetActions): Array<DefaultItemIconButtonAction<Case>> => [
  {
    description: i18n.DELETE_CASE(),
    icon: 'trash',
    color: 'danger',
    name: i18n.DELETE_CASE(),
    onClick: deleteCaseOnClick,
    type: 'icon',
    'data-test-subj': 'action-delete',
  },
];
