/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
} from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FC, ReactEventHandler } from 'react';

interface Props {
  displayName: string;
  help: string;
  onValueAdd?: ReactEventHandler;
}

export const ArgAdd: FC<Props> = ({ onValueAdd = () => {}, displayName, help }) => {
  return (
    <button className="canvasArg__add" onClick={onValueAdd}>
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
