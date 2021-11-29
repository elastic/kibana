/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactEventHandler } from 'react';
import PropTypes from 'prop-types';
import {
  useEuiTheme,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { argAddStylesFactory } from './arg_add.styles';

interface Props {
  displayName: string;
  help: string;
  onValueAdd?: ReactEventHandler;
}

export const ArgAdd: FC<Props> = ({ onValueAdd = () => {}, displayName, help }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <button css={argAddStylesFactory(euiTheme)} onClick={onValueAdd}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{displayName}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <small>{help}</small>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </button>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string.isRequired,
  help: PropTypes.string.isRequired,
  onValueAdd: PropTypes.func,
};
