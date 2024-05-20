/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
import { Loading } from '../../loading';
import { useExpressionsService } from '../../../services';
import { DatasourcePreview as Component } from './datasource_preview';

export const DatasourcePreview = (props) => {
  const [datatable, setDatatable] = useState();
  const expressionsService = useExpressionsService();

  useEffect(() => {
    expressionsService
      .interpretAst({ type: 'expression', chain: [props.function] }, {})
      .then(setDatatable);
  }, [expressionsService, props.function, setDatatable]);

  if (!datatable) {
    return <Loading {...props} />;
  }

  return <Component {...props} datatable={datatable} setDatatable={setDatatable} />;
};

DatasourcePreview.propTypes = {
  function: PropTypes.object,
};
