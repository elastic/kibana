/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash';
import mockElasticsearch from './elasticsearch_plugin';

const config = {
  canvas: {
    enabled: true,
    indexPrefix: '.canvas',
  },
};

export class Plugin {
  constructor(props) {
    this.props = props;
    this.routes = [];
    this.server = {
      plugins: {
        [this.props.name]: {},
        elasticsearch: mockElasticsearch,
      },
      config: () => ({
        get: (key) => get(config, key),
        has: (key) => has(config, key),
      }),
      route: (def) => this.routes.push(def),
    };

    const { init } = this.props;

    this.init = () => init(this.server);
  }
}

export default {
  Plugin,
};
