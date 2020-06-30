/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';

const { WorkpadCreate: strings } = ComponentStrings;

export const WorkpadCreate = ({ createPending, onCreate, ...rest }) => (
  <EuiButton
    {...rest}
    iconType="plusInCircle"
    fill
    onClick={onCreate}
    isLoading={createPending}
    data-test-subj="create-workpad-button"
  >
    {strings.getWorkpadCreateButtonLabel()}
  </EuiButton>
);

WorkpadCreate.propTypes = {
  onCreate: PropTypes.func.isRequired,
  createPending: PropTypes.bool,
};
