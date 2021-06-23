/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';

import { MANAGE_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../constants';

interface Props {
  onManageClick(): void;
  onDeleteClick(): void;
}

export const UsersAndRolesRowActions: React.FC<Props> = ({ onManageClick, onDeleteClick }) => (
  <>
    <EuiButtonIcon onClick={onManageClick} iconType="pencil" aria-label={MANAGE_BUTTON_LABEL} />{' '}
    <EuiButtonIcon onClick={onDeleteClick} iconType="trash" aria-label={DELETE_BUTTON_LABEL} />
  </>
);
