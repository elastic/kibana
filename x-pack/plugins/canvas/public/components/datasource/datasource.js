/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { NoDatasource } from './no_datasource';
import { DatasourceComponent } from './datasource_component';

export const Datasource = (props) => {
  const { datasource, stateDatasource } = props;
  if (!datasource || !stateDatasource) {
    return <NoDatasource {...props} />;
  }

  return <DatasourceComponent {...props} />;
};

Datasource.propTypes = {
  args: PropTypes.object,
  datasource: PropTypes.object,
  unknownArgs: PropTypes.array,
};
