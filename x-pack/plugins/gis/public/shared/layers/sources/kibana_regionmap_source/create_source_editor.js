/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiSelect,
  EuiFormRow,
} from '@elastic/eui';

const NO_REGIONMAP_LAYERS_MSG =
  'No vector layers are available.' +
  ' Ask your system administrator to set "map.regionmap" in kibana.yml.';

export function CreateSourceEditor({ onSelect, regionmapLayers }) {

  const regionmapOptions = regionmapLayers.map(({ name, url }) => {
    return {
      value: url,
      text: name
    };
  });

  const onChange = ({ target }) => {
    const selectedName = target.options[target.selectedIndex].text;
    onSelect({ name: selectedName });
  };

  return (
    <EuiFormRow
      label="Vector layer"
      helpText={regionmapLayers.length === 0 ? NO_REGIONMAP_LAYERS_MSG : null}
    >
      <EuiSelect
        hasNoInitialSelection
        options={regionmapOptions}
        onChange={onChange}
        disabled={regionmapLayers.length === 0}
      />
    </EuiFormRow>
  );
}

CreateSourceEditor.propTypes = {
  onSelect: PropTypes.func.isRequired,
  regionmapLayers: PropTypes.arrayOf(PropTypes.shape({
    url: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })),
};

CreateSourceEditor.defaultProps = {
  regionmapLayers: [],
};
