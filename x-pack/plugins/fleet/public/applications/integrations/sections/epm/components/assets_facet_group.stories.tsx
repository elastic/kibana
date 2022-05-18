/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AssetsFacetGroup as Component } from './assets_facet_group';

export default {
  component: Component,
  title: 'Sections/EPM/Assets Facet Group',
};

interface Args {
  width: number;
}

const args: Args = {
  width: 250,
};

export const AssetsFacetGroup = ({ width }: Args) => {
  return (
    <div style={{ width }}>
      <Component
        assets={{
          kibana: {
            csp_rule_template: [],
            dashboard: [],
            visualization: [],
            index_pattern: [],
            search: [],
            map: [],
            lens: [],
            security_rule: [],
            ml_module: [],
            tag: [],
            osquery_pack_asset: [],
            osquery_saved_query: [],
          },
          elasticsearch: {
            component_template: [],
            data_stream_ilm_policy: [],
            ilm_policy: [],
            index_template: [],
            ingest_pipeline: [],
            transform: [],
            ml_model: [],
          },
        }}
      />
    </div>
  );
};

AssetsFacetGroup.args = args;
